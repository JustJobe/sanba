import io
import os
import logging
from google import genai
from google.genai import types
from PIL import Image as PILImage

logger = logging.getLogger(__name__)

THINKING_MODEL = "gemini-2.5-flash"
IMAGE_MODEL = "gemini-2.5-flash-image"
IMAGE_MODEL_DISPLAY_NAME = "Gemini 2.5 Flash Image"

REMASTER_ANALYSIS_PROMPT = (
    "You are a professional photo retouching expert. Analyze this photograph carefully.\n\n"
    "Determine whether it is colour or black-and-white. Describe the lighting, tonal range, "
    "skin tones, background elements, and any age-related degradation (grain, fading, damage, colour shift).\n\n"
    "Then write a precise, actionable remaster plan: which colours to enhance or assign (for B&W), "
    "how to adjust lighting and contrast, what degradation to remove, and how to modernise the look "
    "while preserving the subject's exact likeness and the soul of the original.\n\n"
    "Output ONLY the analysis and plan as plain text."
)

REMASTER_GENERATION_PREFIX = (
    "You are a professional photo retouching expert. "
    "Using the following expert analysis and remaster plan, modernize this photograph exactly as instructed.\n\n"
    "You MUST NOT:\n"
    "- Change the subject's identity, likeness, or any original scene elements\n"
    "- Add people, objects, or backgrounds not present in the original\n\n"
    "Output ONLY the remastered image, same dimensions, no borders or padding.\n\n"
    "--- REMASTER PLAN ---\n"
)


def remaster_image_sync(input_path: str, output_path: str) -> tuple[str, int]:
    """Two-step pipeline: thinking model analyzes the image, image model executes the remaster.
    Returns (output_path, thinking_tokens)."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set")

    client = genai.Client(api_key=api_key)

    # Encode as lossless PNG — guarantees full colour fidelity for both API calls
    img = PILImage.open(input_path).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    png_bytes = buf.getvalue()
    image_part = types.Part.from_bytes(data=png_bytes, mime_type="image/png")

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
            return output_path, thinking_tokens

    raise ValueError("Gemini returned no image in the response")
