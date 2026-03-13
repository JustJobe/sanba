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
    "Restore this old photograph: fix all damage, scratches, tears, stains, and fading. "
    "Enhance clarity, sharpness, and natural colors while maintaining the authentic look. "
    "Output only the restored image with no borders or modifications outside the original frame."
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
