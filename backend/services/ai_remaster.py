import io
import os
import logging
from google import genai
from google.genai import types
from PIL import Image as PILImage

logger = logging.getLogger(__name__)

MODEL_NAME = "gemini-2.5-flash-image"
MODEL_DISPLAY_NAME = "Gemini 2.5 Flash Image"

REMASTER_PROMPT = (
    "Analyze the attached image and modernize it as follows:\n\n"
    "If the image is already in color: Enhance the palette to be vivid, punchy, and "
    "contemporary. Retain all original elements, the layout, and the subject's exact "
    "likeness, but render them with the clarity and rich color gamut of a modern "
    "high-end digital photograph.\n\n"
    "If the image is black and white or monochromatic: Perform a full, natural "
    "colorization based on the most plausible real-world tones.\n\n"
    "In both scenarios: Remove all age-related grain, cracks, or fading. Apply "
    "professional studio lighting, enhance skin textures for a healthy glow, and "
    "ensure the final output is a crisp, high-resolution modern print that maintains "
    "the soul of the original capture.\n\n"
    "Output ONLY the remastered image, same dimensions, no borders or padding."
)


def remaster_image_sync(input_path: str, output_path: str) -> str:
    """Call Gemini API to AI-remaster an image. Runs synchronously (called from background thread)."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set")

    client = genai.Client(api_key=api_key)
    img = PILImage.open(input_path)

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=[REMASTER_PROMPT, img],
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
