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


class RemasterResult(NamedTuple):
    output_path: str
    thinking_tokens: int
    duration_secs: float
    input_width: int
    input_height: int
    input_bytes: int

THINKING_MODEL = "gemini-3-flash-preview"
IMAGE_MODEL = "gemini-3-pro-image-preview"
IMAGE_MODEL_DISPLAY_NAME = "Gemini 3 Pro Image Preview"

REMASTER_ANALYSIS_PROMPT = (
    "You are a professional photo retouching expert preparing a job for an AI image generator.\n\n"
    "Your goal is to enhance this photograph's quality — sharper, cleaner, with vivid colour — "
    "while preserving every visible detail EXACTLY as it appears. You are enhancing, not "
    "reimagining. Every garment, accessory, prop, and background element must remain identical.\n\n"
    "Step 1 — Catalog the photograph with extreme precision: determine if it is colour or "
    "black-and-white. For every person, describe their exact clothing in full detail — necklines, "
    "collars, sleeves, buttons, hems, patterns, fit. Note every accessory: flowers, pins, "
    "jewellery, hats, bouquets, boutonnières. Catalog every prop and background element. Note "
    "the lighting direction, tonal range, and any age-related degradation (grain, fading, "
    "cracks, colour shift). This inventory is your ground truth — nothing may be changed.\n\n"
    "Step 2 — Plan the enhancement: for B&W images assign historically plausible colours to "
    "every cataloged element, staying conservative and realistic. For colour images plan how to "
    "boost vibrancy and clarity. Improve lighting clarity while preserving the original direction "
    "and mood — do NOT invent a new lighting style. Plan removal of degradation (grain, fading, "
    "staining). Skin should look natural and clear, not artificially retouched.\n\n"
    "Step 3 — Write a single, self-contained image generation prompt that describes the enhanced "
    "photograph. CRITICAL: describe every garment detail, accessory, and prop EXACTLY as you "
    "cataloged them in Step 1 — same necklines, same collars, same accessories, same fit. "
    "The only differences from the original should be: improved sharpness, cleaner grain, "
    "enhanced colour vibrancy, and removal of age-related damage. The prompt must stand alone — "
    "do NOT reference 'the original image'. Describe what the output looks like in precise detail, "
    "but change NOTHING about the subjects, their clothing, or the scene.\n\n"
    "Output ONLY the final image generation prompt from Step 3 as plain text."
)

REMASTER_GENERATION_PREFIX = (
    "PHOTO ENHANCEMENT TASK — read every constraint before generating.\n\n"
    "The attached image is the REFERENCE ORIGINAL. Your output must preserve every element "
    "of the original exactly — you are enhancing quality and clarity, NOT reimagining the scene. "
    "Treat the reference as the absolute ground truth for composition and content.\n\n"
    "CRITICAL RULE: If the enhancement description below contradicts what you see in the "
    "reference image, ALWAYS follow the reference image. The image is the ultimate authority.\n\n"
    "MUST NOT CHANGE under any circumstances:\n"
    "- Every person's face, identity, expression, facial hair, skin tone, and features\n"
    "- The exact number of people and their positions, poses, and body proportions\n"
    "- Every item of clothing — necklines, collars, sleeves, buttons, hems, patterns, fit\n"
    "- Every accessory — flowers, boutonnières, pins, jewellery, hats, bouquets\n"
    "- All objects, props, and their arrangement within the scene\n"
    "- The overall composition, framing, and spatial relationships — no cropping or reframing\n"
    "- The scene itself — do NOT add, remove, or substitute any element\n\n"
    "YOU MAY ONLY: improve sharpness, reduce grain/noise, boost colour vibrancy, improve "
    "lighting clarity, and remove age-related degradation (fading, staining, colour shift).\n\n"
    "DO NOT: add new people, objects, or background elements. Do NOT change clothing details, "
    "colours, or patterns. Do NOT alter faces or expressions. Do NOT remove any accessories "
    "or props visible in the reference. Do NOT reframe or crop. Do NOT replace the background.\n\n"
    "--- ENHANCEMENT DESCRIPTION ---\n"
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


def remaster_image_sync(input_path: str, output_path: str) -> RemasterResult:
    """Two-step pipeline: thinking model analyzes the image, image model executes the remaster.
    Returns RemasterResult(output_path, thinking_tokens, duration_secs, input_width, input_height, input_bytes)."""
    from .gemini_limiter import gemini_semaphore
    with gemini_semaphore:
        return _remaster_image_sync_inner(input_path, output_path)


def _remaster_image_sync_inner(input_path: str, output_path: str) -> RemasterResult:
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

    # Step 1: Thinking model analyzes the image and produces a detailed remaster plan
    try:
        analysis_response = client.models.generate_content(
            model=THINKING_MODEL,
            contents=[REMASTER_ANALYSIS_PROMPT, image_part],
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=8192),
            ),
        )
    except Exception as e:
        _raise_if_content_policy(e, "remaster analysis")
        raise

    # Detect content policy refusal from the thinking model
    _check_content_policy(analysis_response, "remaster analysis")

    thinking_tokens = getattr(analysis_response.usage_metadata, "thoughts_token_count", 0) or 0
    analysis_text = analysis_response.text or ""
    logger.info(f"AI remaster analysis complete — thinking tokens: {thinking_tokens}")
    logger.debug(f"AI remaster analysis:\n{analysis_text}")

    # Step 2: Image model executes the remaster using the detailed plan
    generation_prompt = REMASTER_GENERATION_PREFIX + analysis_text
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
        _raise_if_content_policy(e, "remaster generation")
        raise

    # Detect content policy refusal from the image model
    _check_content_policy(gen_response, "remaster generation")

    for part in gen_response.parts:
        if part.inline_data is not None:
            pil_img = PILImage.open(io.BytesIO(part.inline_data.data))
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            # subsampling=0 → 4:4:4 chroma (full colour resolution, not halved default)
            pil_img.convert("RGB").save(output_path, "JPEG", quality=97, subsampling=0)
            duration_secs = time.monotonic() - t_start
            return RemasterResult(
                output_path=output_path,
                thinking_tokens=thinking_tokens,
                duration_secs=round(duration_secs, 3),
                input_width=input_width,
                input_height=input_height,
                input_bytes=input_bytes,
            )

    raise GeminiContentPolicyError("Gemini declined to generate an image — content policy refusal")
