import io
import os
import time
import logging
from typing import NamedTuple
from google import genai
from google.genai import types
from PIL import Image as PILImage

logger = logging.getLogger(__name__)


class GeminiContentPolicyError(Exception):
    """Raised when Gemini refuses to process an image due to content policy (e.g. images of minors)."""
    pass


class RepairResult(NamedTuple):
    output_path: str
    thinking_tokens: int
    duration_secs: float
    input_width: int
    input_height: int
    input_bytes: int

THINKING_MODEL = "gemini-3-flash-preview"
IMAGE_MODEL = "gemini-3-pro-image-preview"
IMAGE_MODEL_DISPLAY_NAME = "Gemini 3 Pro Image Preview"

REPAIR_ANALYSIS_PROMPT = (
    "You are a professional photo restoration expert preparing a job for an AI image generator.\n\n"
    "Your ONLY goal is to return the photograph to how it originally looked when it was first taken — "
    "no modernisation, no colour enhancement, no style changes. Preserve the era, aesthetic, and "
    "tone of the original exactly.\n\n"
    "Step 1 — Inventory every defect: cracks, scratches, tears, stains, fading, missing areas, "
    "colour shifts. For each defect note its exact location, size, and severity.\n\n"
    "Step 2 — For each defect, determine the correct original content using adjacent texture, "
    "colour, and tone as reference cues. Describe how to fill each area so it blends seamlessly "
    "with the undamaged parts of the photo.\n\n"
    "Step 3 — Write a single, self-contained image generation prompt that describes the fully "
    "repaired photograph as if it were the clean, undamaged original print: every element (people, "
    "clothing, objects, background, lighting, tones) in precise detail matching the original era "
    "and style. Do NOT add anything not already present. Do NOT modernise colours, lighting, or "
    "style. The prompt must stand alone — do not reference 'the original' or 'restore X'.\n\n"
    "Output ONLY the final image generation prompt from Step 3 as plain text."
)

REPAIR_GENERATION_PREFIX = (
    "SURGICAL RESTORATION TASK — read every constraint before generating.\n\n"
    "The attached image is the REFERENCE ORIGINAL. Your output must match it in every way "
    "except for the specific physical damage listed below. Treat the reference as ground truth.\n\n"
    "ABSOLUTE CONSTRAINTS — these must not change under any circumstances:\n"
    "- Every person's face, expression, facial hair, skin tone, and features\n"
    "- All body proportions, poses, and positions\n"
    "- Every item of clothing, its colour, pattern, and fit\n"
    "- The entire background scene, objects, and their arrangement\n"
    "- Colour tones, contrast, and lighting direction of the original\n"
    "- The era, aesthetic, and photographic style — do NOT modernise\n"
    "- Image composition and framing — no cropping, zooming, or reframing\n\n"
    "YOU MAY ONLY: remove physical damage (cracks, scratches, tears, stains, fading) "
    "and fill those areas using surrounding texture and tone as reference.\n\n"
    "DO NOT: reinterpret, enhance, modernise, alter colours, change any described element, "
    "or add anything not visible in the reference photo.\n\n"
    "--- DAMAGE REPAIR INSTRUCTIONS ---\n"
)


# Blocked finish reasons that indicate a content policy / safety refusal
_BLOCKED_FINISH_REASONS = frozenset({
    "SAFETY", "PROHIBITED_CONTENT", "IMAGE_SAFETY", "RECITATION", "BLOCKLIST", "OTHER"
})

_REFUSAL_KEYWORDS = (
    "content policy", "prohibited", "safety", "cannot process",
    "can't process", "unable to process", "minors", "children",
    "not able to generate", "unable to generate",
)

_CONTENT_POLICY_ERROR_KEYWORDS = (
    "safety", "prohibited", "content_policy", "blocked", "image_safety",
    "request_prohibited", "unsupported_user_location",
)


def _check_content_policy(response, stage: str) -> None:
    """Inspect a Gemini response and raise GeminiContentPolicyError if it was blocked."""
    try:
        for candidate in (response.candidates or []):
            finish_reason = str(getattr(candidate, "finish_reason", "") or "").upper()
            if any(blocked in finish_reason for blocked in _BLOCKED_FINISH_REASONS):
                raise GeminiContentPolicyError(
                    f"Gemini content policy block at {stage}: finish_reason={finish_reason}"
                )
    except GeminiContentPolicyError:
        raise
    except Exception:
        pass  # don't crash on attribute errors in SDK version differences

    # Also check text content for soft refusals (no image returned, just text)
    try:
        text = (response.text or "").lower()
        if text and any(kw in text for kw in _REFUSAL_KEYWORDS):
            raise GeminiContentPolicyError(
                f"Gemini content policy soft-refusal at {stage}: response contained refusal language"
            )
    except GeminiContentPolicyError:
        raise
    except Exception:
        pass


def _raise_if_content_policy(exc: Exception, stage: str) -> None:
    """If the exception looks like a content policy block, re-raise as GeminiContentPolicyError."""
    msg = str(exc).lower()
    if any(kw in msg for kw in _CONTENT_POLICY_ERROR_KEYWORDS):
        raise GeminiContentPolicyError(
            f"Gemini API content policy error at {stage}: {exc}"
        )


def repair_image_sync(input_path: str, output_path: str) -> RepairResult:
    """Two-step pipeline: thinking model analyzes damage, image model executes the repair.
    Returns RepairResult(output_path, thinking_tokens, duration_secs, input_width, input_height, input_bytes)."""
    from .gemini_limiter import gemini_semaphore
    with gemini_semaphore:
        return _repair_image_sync_inner(input_path, output_path)


def _repair_image_sync_inner(input_path: str, output_path: str) -> RepairResult:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set")

    client = genai.Client(api_key=api_key)

    # Encode as lossless PNG — guarantees full colour fidelity for both API calls
    img = PILImage.open(input_path).convert("RGB")
    input_width, input_height = img.width, img.height
    input_bytes = os.path.getsize(input_path)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    png_bytes = buf.getvalue()
    image_part = types.Part.from_bytes(data=png_bytes, mime_type="image/png")

    t_start = time.monotonic()

    # Step 1: Thinking model analyzes the image and produces a detailed repair plan
    try:
        analysis_response = client.models.generate_content(
            model=THINKING_MODEL,
            contents=[REPAIR_ANALYSIS_PROMPT, image_part],
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=8192),
            ),
        )
    except Exception as e:
        _raise_if_content_policy(e, "repair analysis")
        raise

    # Detect content policy refusal from the thinking model
    _check_content_policy(analysis_response, "repair analysis")

    thinking_tokens = getattr(analysis_response.usage_metadata, "thoughts_token_count", 0) or 0
    analysis_text = analysis_response.text or ""
    logger.info(f"AI repair analysis complete — thinking tokens: {thinking_tokens}")
    logger.debug(f"AI repair analysis:\n{analysis_text}")

    # Step 2: Image model executes the repair using the detailed plan
    generation_prompt = REPAIR_GENERATION_PREFIX + analysis_text
    image_part2 = types.Part.from_bytes(data=png_bytes, mime_type="image/png")

    try:
        gen_response = client.models.generate_content(
            model=IMAGE_MODEL,
            contents=[generation_prompt, image_part2],
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
            ),
        )
    except Exception as e:
        _raise_if_content_policy(e, "repair generation")
        raise

    # Detect content policy refusal from the image model
    _check_content_policy(gen_response, "repair generation")

    for part in gen_response.parts:
        if part.inline_data is not None:
            pil_img = PILImage.open(io.BytesIO(part.inline_data.data))
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            # subsampling=0 → 4:4:4 chroma (full colour resolution, not halved default)
            pil_img.convert("RGB").save(output_path, "JPEG", quality=97, subsampling=0)
            duration_secs = time.monotonic() - t_start
            return RepairResult(
                output_path=output_path,
                thinking_tokens=thinking_tokens,
                duration_secs=round(duration_secs, 3),
                input_width=input_width,
                input_height=input_height,
                input_bytes=input_bytes,
            )

    raise GeminiContentPolicyError("Gemini declined to generate an image — content policy refusal")
