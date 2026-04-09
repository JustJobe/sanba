"""
Available AI model tiers for Repair and Remaster operations.

Both tiers share the same analysis/thinking model; only the image
generation model differs.  Pricing is stored in system_settings
(keys: ai_repair_cost_{tier}, ai_remaster_cost_full_{tier},
ai_remaster_cost_discounted_{tier}).
"""

MODEL_TIERS = {
    "pro": {
        "id": "pro",
        "display_name": "Gemini 3 Pro",
        "thinking_model": "gemini-3-flash-preview",
        "image_model": "gemini-3-pro-image-preview",
        "description": "Highest quality \u2014 best for important photos",
    },
    "flash": {
        "id": "flash",
        "display_name": "Gemini 3.1 Flash",
        "thinking_model": "gemini-3-flash-preview",
        "image_model": "gemini-3.1-flash-image-preview",
        "description": "Fast and affordable \u2014 good for most photos",
    },
}

DEFAULT_TIER = "flash"
