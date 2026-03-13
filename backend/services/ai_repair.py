import io
import os
import logging
from google import genai
from google.genai import types
from PIL import Image as PILImage

logger = logging.getLogger(__name__)

MODEL_NAME = "gemini-2.5-flash-image"
MODEL_DISPLAY_NAME = "Gemini 2.5 Flash Image"

RESTORATION_PROMPT = (
    "You are a professional photo restoration expert. "
    "Fully restore this damaged photograph to its original, undamaged appearance.\n\n"
    "You SHOULD:\n"
    "- Completely remove all cracks, scratches, tears, dust spots, stains, and fading\n"
    "- Reconstruct missing or damaged areas including faces, hair, clothing, and backgrounds\n"
    "- Fill in torn or missing sections using surrounding context to infer what was there\n"
    "- Restore natural clarity and tones so the image looks like a clean, well-preserved print\n\n"
    "You MUST NOT:\n"
    "- Add new cracks, scratches, damage marks, or texture artifacts not present in the input\n"
    "- Invent new people, objects, or background elements not implied by the existing content\n\n"
    "Output ONLY the restored image, same dimensions, no borders or padding."
)


def repair_image_sync(input_path: str, output_path: str) -> str:
    """Call Gemini API to AI-repair an image. Runs synchronously (called from background thread)."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set")

    client = genai.Client(api_key=api_key)
    img = PILImage.open(input_path)

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=[RESTORATION_PROMPT, img],
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
        ),
    )

    for part in response.parts:
        if part.inline_data is not None:
            pil_img = PILImage.open(io.BytesIO(part.inline_data.data))
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            pil_img.convert("RGB").save(output_path, "JPEG", quality=95)
            return output_path

    raise ValueError("Gemini returned no image in the response")
