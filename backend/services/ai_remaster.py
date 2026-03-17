import io
import os
import time
import logging
from typing import NamedTuple
from google import genai
from google.genai import types
from PIL import Image as PILImage

logger = logging.getLogger(__name__)


class RemasterResult(NamedTuple):
    output_path: str
    thinking_tokens: int
    duration_secs: float
    input_width: int
    input_height: int
    input_bytes: int

THINKING_MODEL = "gemini-3-flash-preview"
IMAGE_MODEL = "gemini-3.1-flash-image-preview"
IMAGE_MODEL_DISPLAY_NAME = "Gemini 3.1 Flash Image Preview"

REMASTER_ANALYSIS_PROMPT = (
    "You are a professional photo retouching expert preparing a job for an AI image generator.\n\n"
    "Your goal is to make this photograph look like it was shot today with modern equipment — "
    "vivid, punchy, high-resolution. You have full creative latitude to enhance colours, modernise "
    "lighting, remove all age-related degradation, and make the image pop. However, you MUST "
    "preserve the subject's exact identity and likeness, and all original scene elements.\n\n"
    "Step 1 — Analyze the photograph: determine if it is colour or black-and-white. Catalog every "
    "element (subjects, clothing, props, background, lighting). Note tonal range, skin tones, "
    "colour palette, and any age-related degradation (grain, fading, cracks, colour shift).\n\n"
    "Step 2 — Decide on the modernization: for B&W assign specific, realistic colours to every "
    "element; for colour images choose how to enhance and punch up the palette. Determine a modern "
    "lighting style (e.g. soft natural daylight, clean studio light). Plan removal of all "
    "degradation and how to enhance skin textures for a healthy, contemporary glow.\n\n"
    "Step 3 — Write a single, self-contained image generation prompt that describes the fully "
    "remastered photograph as if it were already complete: every subject, garment, prop, and "
    "background element described with precise colours, textures, and lighting as they should "
    "appear in the modern version. The prompt must stand alone — do NOT reference 'the original "
    "image' or 'remaster X'. Describe what the output SHOULD look like, in vivid detail.\n\n"
    "Output ONLY the final image generation prompt from Step 3 as plain text."
)

REMASTER_GENERATION_PREFIX = (
    "You are a professional photo retouching expert. "
    "Generate the remastered photograph exactly as described below. "
    "Preserve the subject's exact likeness and all original scene elements. "
    "Do NOT add people, objects, or backgrounds not described.\n\n"
    "Output ONLY the remastered image, same dimensions, no borders or padding.\n\n"
    "--- IMAGE DESCRIPTION ---\n"
)


def remaster_image_sync(input_path: str, output_path: str) -> RemasterResult:
    """Two-step pipeline: thinking model analyzes the image, image model executes the remaster.
    Returns RemasterResult(output_path, thinking_tokens, duration_secs, input_width, input_height, input_bytes)."""
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
    analysis_response = client.models.generate_content(
        model=THINKING_MODEL,
        contents=[REMASTER_ANALYSIS_PROMPT, image_part],
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_budget=8192),
        ),
    )

    thinking_tokens = getattr(analysis_response.usage_metadata, "thoughts_token_count", 0) or 0
    analysis_text = analysis_response.text or ""
    logger.info(f"AI remaster analysis complete — thinking tokens: {thinking_tokens}")
    logger.debug(f"AI remaster analysis:\n{analysis_text}")

    # Step 2: Image model executes the remaster using the detailed plan
    generation_prompt = REMASTER_GENERATION_PREFIX + analysis_text
    image_part2 = types.Part.from_bytes(data=png_bytes, mime_type="image/png")

    gen_response = client.models.generate_content(
        model=IMAGE_MODEL,
        contents=[generation_prompt, image_part2],
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
        ),
    )

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

    raise ValueError("Gemini returned no image in the response")
