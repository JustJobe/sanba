import cv2
import os
import asyncio
import numpy as np
import logging

logger = logging.getLogger(__name__)

# -----------------------------
# Async wrapper stays the same
# -----------------------------
async def process_image(image_path: str, output_path: str, operation: str = "denoise", photo_type: str = "color"):
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _process_sync, image_path, output_path, operation, photo_type)
    return output_path


# -----------------------------
# Lightweight analysis helpers
# -----------------------------
def analyze_luminance(L: np.ndarray) -> dict:
    """
    Returns simple metrics to adapt parameters:
      - blur: Laplacian variance (lower => blurrier)
      - noise: mean abs high-frequency residual
    """
    Lf = L.astype(np.float32)
    lap = cv2.Laplacian(Lf, cv2.CV_32F)
    blur = float(lap.var())

    # high-frequency energy proxy
    blur_small = cv2.GaussianBlur(Lf, (0, 0), 1.2)
    noise = float(np.mean(np.abs(Lf - blur_small)))

    return {"blur": blur, "noise": noise}


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def detect_photo_type(img: np.ndarray) -> str:
    """
    Classifies a loaded BGR image as 'bw' or 'color' using a two-stage approach:
    Stage 1: HSV mean saturation fast-path for pure grayscale (< 8).
    Stage 2: Inter-channel Pearson correlation on a 128x128 downsample.
      - Monochromatic images (even with a color cast) have all channels tracking
        the same luminance signal → high correlation (> 0.97).
      - True color photos have channels carrying independent info → lower corr.
    This correctly handles blue/sepia-cast mono photos that fool pure saturation checks.
    ~2-3ms total, no extra I/O since image is already in memory.
    """
    small = cv2.resize(img, (128, 128))
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
    mean_sat = float(np.mean(hsv[:, :, 1]))

    # Stage 1: fast path for pure grayscale
    if mean_sat < 8:
        logger.info(f"Photo type detection — mean_sat: {mean_sat:.1f} → bw (fast path)")
        return 'bw'

    # Stage 2: inter-channel correlation
    b = small[:, :, 0].flatten().astype(np.float64)
    g = small[:, :, 1].flatten().astype(np.float64)
    r = small[:, :, 2].flatten().astype(np.float64)
    min_corr = min(
        np.corrcoef(b, g)[0, 1],
        np.corrcoef(b, r)[0, 1],
        np.corrcoef(g, r)[0, 1],
    )
    result = 'bw' if min_corr > 0.97 else 'color'
    logger.info(f"Photo type detection — mean_sat: {mean_sat:.1f}, min_corr: {min_corr:.4f} → {result}")
    return result


# -----------------------------
# New: B&W speckle (dust) removal
# -----------------------------
def remove_speckles_gray(gray: np.ndarray, strength: float = 1.0) -> np.ndarray:
    """
    Removes tiny bright speckles common in scanned prints.
    strength: 0..1
    """
    if strength <= 0:
        return gray

    # Morphological Despeckle (Simulation of Digital ICE / IR Cleaning logic)
    # 1. Structural Element for detection
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))

    # 2. TopHat: Reveals bright spots on dark background (Dust/Scratches)
    tophat = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, kernel)
    
    # 3. BlackHat: Reveals dark spots on light background (Pits/Dirt)
    blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)

    # 4. Thresholding to identifying significant anomalies
    # Use a fixed contrast threshold (e.g., difference > 25)
    _, mask_white = cv2.threshold(tophat, 25, 255, cv2.THRESH_BINARY)
    _, mask_black = cv2.threshold(blackhat, 25, 255, cv2.THRESH_BINARY)
    
    # Combined Mask
    mask = cv2.bitwise_or(mask_white, mask_black)

    # 5. Filter by Size (Keep only small dust/scratches)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    final_mask = np.zeros_like(mask)
    
    # Parameters for 'dust' size
    max_area = 150  # increased slightly
    min_area = 2

    count_speckles = 0
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if min_area <= area <= max_area:
            final_mask[labels == i] = 255
            count_speckles += 1

    print(f"[DEBUG] Morphological Despeckle: Detected {count_speckles} candidate spots.")
    
    total_pixels = gray.shape[0] * gray.shape[1]
    affected_pixels = np.count_nonzero(final_mask)
    coverage_pct = (affected_pixels / total_pixels) * 100
    print(f"[DEBUG] Despeckle Coverage: {coverage_pct:.4f}% ({affected_pixels} pixels)")

    # 6. Dilate slightly more to ensure we cover the edge of the dust
    if np.sum(final_mask) > 0:
        # Increased kernel size for dilation to make sure we kill the halo
        dil_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        final_mask = cv2.dilate(final_mask, dil_kernel, iterations=2) # 2 iterations to be SURE
        
        # 7. Inpaint
        # Use Telea or NS. Telea is often better for small spots.
        cleaned = cv2.inpaint(gray, final_mask, 3, cv2.INPAINT_TELEA)
        
        # Blend based on strength (usually 1.0 for dust removal)
        return cv2.addWeighted(gray, 1.0 - strength, cleaned, strength, 0)

    return gray


# -----------------------------
# New: Color denoise in LAB (L only)
# -----------------------------
def denoise_color_lab(img_bgr: np.ndarray, h_L: float, chroma_smooth: float = 0.6) -> np.ndarray:
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    L, A, B = cv2.split(lab)

    # NLM on L only
    L_dn = cv2.fastNlMeansDenoising(L, None, h_L, 7, 21)

    # Gentle chroma smoothing (avoid watercolor)
    if chroma_smooth > 0:
        # small gaussian is cheap and safe; bilateral is heavier
        A_sm = cv2.GaussianBlur(A, (0, 0), chroma_smooth)
        B_sm = cv2.GaussianBlur(B, (0, 0), chroma_smooth)
    else:
        A_sm, B_sm = A, B

    return cv2.cvtColor(cv2.merge((L_dn, A_sm, B_sm)), cv2.COLOR_LAB2BGR)


def detail_reinject_lab(original_bgr: np.ndarray, processed_bgr: np.ndarray, amount: float = 0.2) -> np.ndarray:
    """
    Re-inject luminance detail to avoid plastic/smudged look.
    amount: 0..0.5 typical
    """
    if amount <= 0:
        return processed_bgr

    o_lab = cv2.cvtColor(original_bgr, cv2.COLOR_BGR2LAB)
    p_lab = cv2.cvtColor(processed_bgr, cv2.COLOR_BGR2LAB)
    oL, oA, oB = cv2.split(o_lab)
    pL, pA, pB = cv2.split(p_lab)

    detail = cv2.subtract(oL, pL)
    pL2 = cv2.addWeighted(pL, 1.0, detail, amount, 0)

    out = cv2.cvtColor(cv2.merge((pL2, pA, pB)), cv2.COLOR_LAB2BGR)
    return out


# -----------------------------
# Safer CLAHE defaults
# -----------------------------
def apply_clahe_L_only(image_bgr: np.ndarray, clipLimit: float = 1.25, tile=(8, 8)) -> np.ndarray:
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
    L, A, B = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=clipLimit, tileGridSize=tile)
    L2 = clahe.apply(L)
    return cv2.cvtColor(cv2.merge((L2, A, B)), cv2.COLOR_LAB2BGR)


def apply_clahe_gray(image_gray: np.ndarray, clipLimit: float = 1.4, tile=(8, 8)) -> np.ndarray:
    clahe = cv2.createCLAHE(clipLimit=clipLimit, tileGridSize=tile)
    return clahe.apply(image_gray)


def apply_warm_tone(image_bgr: np.ndarray, strength: float = 0.15) -> np.ndarray:
    """
    Applies a subtle "cream/warm" tone to B&W images.
    Uses a standard Sepia matrix but blended at low strength (default 15%).
    Input: BGR image (converted from gray)
    """
    if strength <= 0:
        return image_bgr

    # Standard Sepia Matrix (for BGR input where B=G=R)
    # Row 0=Blue, Row 1=Green, Row 2=Red
    # Since input is neutral gray, the channel order in the row doesn't matter for the sum,
    # but the Reference Row Sums are:
    # B: ~0.937 (Darkest)
    # G: ~1.203
    # R: ~1.351 (Brightest) => Warm/Brown result
    sepia_matrix = np.array([
        [0.272, 0.534, 0.131],
        [0.349, 0.686, 0.168],
        [0.393, 0.769, 0.189]
    ])
    
    # Apply matrix
    sepia = cv2.transform(image_bgr, sepia_matrix)
    
    # Clip to valid range just in case
    sepia = np.clip(sepia, 0, 255).astype(np.uint8)

    # Blend: Original * (1-strength) + Sepia * strength
    # "The 15% Rule"
    return cv2.addWeighted(image_bgr, 1.0 - strength, sepia, strength, 0)


# -----------------------------
# Your existing helpers (kept)
# -----------------------------
def apply_automatic_color_balance(image, strength=0.7):
    channels = cv2.split(image)
    out_channels = []
    for channel in channels:
        low, high = np.percentile(channel, [0.5, 99.5])
        stretched = np.clip(channel, low, high)
        stretched = cv2.normalize(stretched, None, 0, 255, cv2.NORM_MINMAX)
        out_channels.append(stretched.astype(np.uint8))

    balanced = cv2.merge(out_channels)

    img_f = balanced.astype(np.float32)
    avg_b = np.mean(img_f[:, :, 0])
    avg_g = np.mean(img_f[:, :, 1])
    avg_r = np.mean(img_f[:, :, 2])

    avg = (avg_b + avg_g + avg_r) / 3
    if avg > 0:
        scale_b = avg / max(avg_b, 1.0)
        scale_g = avg / max(avg_g, 1.0)
        scale_r = avg / max(avg_r, 1.0)

        img_f[:, :, 0] *= (strength * scale_b + (1 - strength))
        img_f[:, :, 1] *= (strength * scale_g + (1 - strength))
        img_f[:, :, 2] *= (strength * scale_r + (1 - strength))

    return np.clip(img_f, 0, 255).astype(np.uint8)


def apply_gamma_correction(image, gamma=1.0):
    invGamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** invGamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
    return cv2.LUT(image, table)


def remove_scratches(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 1))
    kernel_v = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 7))

    top_h = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, kernel_h)
    top_v = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, kernel_v)
    black_h = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel_h)
    black_v = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel_v)

    mask = cv2.add(cv2.add(top_h, top_v), cv2.add(black_h, black_v))
    _, mask = cv2.threshold(mask, 40, 255, cv2.THRESH_BINARY)
    mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))

    return cv2.inpaint(image, mask, 3, cv2.INPAINT_TELEA)


def apply_unsharp_mask(image, kernel_size=(0, 0), sigma=1.0, amount=0.25, threshold=8):
    """
    Edge-thresholded unsharp mask; threshold prevents sharpening paper grain/noise.
    """
    image_float = image.astype(np.float32)
    blurred = cv2.GaussianBlur(image_float, kernel_size, sigma)
    high_pass = image_float - blurred

    mask = (np.abs(high_pass) > threshold).astype(np.float32)
    sharpened = image_float + amount * high_pass * mask
    return np.clip(sharpened, 0, 255).astype(np.uint8)


# -----------------------------
# Main processing logic (refactored)
# -----------------------------
def _process_sync(image_path: str, output_path: str, operation: str, photo_type: str):
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image from {image_path}")

    if photo_type == "auto":
        photo_type = detect_photo_type(img)
        logger.info(f"Auto-detected photo_type='{photo_type}' for {os.path.basename(image_path)}")

    processed = img

    if operation == "denoise":
        # user requested "color balance only"
        processed = apply_automatic_color_balance(img, strength=0.65)  # lower than before
        processed = remove_red_eye(processed)

    elif operation == "restoration_full":
        if photo_type == "bw":
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Speckle/dust removal first (fixes your white spot issue)
            logger.info("Starting B&W Restoration: Despeckle Phase")
            
            # Debug: Measure mask coverage inside remove_speckles_gray via global/print or just trust the logic?
            # Let's trust the logic but add a log here confirming step
            # gray = remove_speckles_gray(gray, strength=1.0)
            logger.info("B&W Despeckle: SKIPPED (User Request - Texture Check)")

            # Adaptive NLM strength (avoid smudge on already-blurry phone photos)
            metrics = analyze_luminance(gray)
            
            logger.info(f"B&W Metrics - Blur: {metrics['blur']:.2f} (Not used for denoise)")
            logger.info("B&W Denoising: SKIPPED (Strict Texture Retention)")
            
            # If blur is low => image already soft => reduce denoise a bit
            h = 3.5 if metrics["blur"] > 120 else 3.0
            # gray_dn = cv2.fastNlMeansDenoising(gray, None, h, 7, 21)
            gray_dn = gray # Denoising DISABLED for B&W

            # Safer CLAHE (Reduced to 1.1 to avoid enhancing speckles)
            # gray_c = apply_clahe_gray(gray_dn, clipLimit=1.1)
            # logger.info("B&W CLAHE: SKIPPED (User Request - Texture Check)")
            gray_c = gray_dn

            # Optional light sharpen (edge-thresholded)
            bw_bgr = cv2.cvtColor(gray_c, cv2.COLOR_GRAY2BGR)
            bw_bgr = apply_unsharp_mask(bw_bgr, sigma=1.0, amount=0.18, threshold=10)

            # "Subtle Warming" (The Anti-Clinical Fix)
            # 12% strength is usually safer than 15% to avoid 'obviously sepia'
            processed = apply_warm_tone(bw_bgr, strength=0.12)

        else:
            # COLOR
            # Analyze luminance to adapt denoise/sharpen
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            L, _, _ = cv2.split(lab)
            metrics = analyze_luminance(L)

            # adaptive denoise strength
            # blurrier images get less denoise to avoid smudging
            if metrics["blur"] < 90:
                hL = 2.8
                sharp_amt = 0.28
            elif metrics["noise"] > 8:
                hL = 3.6
                sharp_amt = 0.22
            else:
                hL = 3.2
                sharp_amt = 0.24

            # L-only denoise + gentle chroma smooth
            # processed = denoise_color_lab(img, h_L=hL, chroma_smooth=0.7)

            # Scratches (optional; keep after denoise so mask is cleaner)
            processed = remove_scratches(processed)

            # Color balance + tone, reduced strength to avoid "filtered" look
            processed = apply_automatic_color_balance(processed, strength=0.65)
            processed = apply_gamma_correction(processed, gamma=1.06)

            # Texture reinject (very important for scans)
            processed = detail_reinject_lab(img, processed, amount=0.22)

            # CLAHE on L only, safer
            processed = apply_clahe_L_only(processed, clipLimit=1.25)

            # Light sharpen last
            processed = apply_unsharp_mask(processed, sigma=1.0, amount=sharp_amt, threshold=8)

    elif operation == "grayscale":
        processed = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    output_dir = os.path.dirname(output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    cv2.imwrite(output_path, processed)
    return photo_type


# -----------------------------
# Your existing red-eye code (unchanged)
# -----------------------------
def remove_red_eye(image):
    eye_cascade_path = os.path.join(cv2.data.haarcascades, 'haarcascade_eye.xml')
    if not os.path.exists(eye_cascade_path):
        return image

    eye_cascade = cv2.CascadeClassifier(eye_cascade_path)

    img_out = image.copy()
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    eyes = eye_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)

    for (ex, ey, ew, eh) in eyes:
        eye_roi_color = img_out[ey:ey+eh, ex:ex+ew]
        b = eye_roi_color[:, :, 0]
        g = eye_roi_color[:, :, 1]
        r = eye_roi_color[:, :, 2]

        bg_sum = b.astype(float) + g.astype(float)
        mask = (r.astype(float) > 150) & (r.astype(float) > (bg_sum / 2) * 1.5)
        mask = mask.astype(np.uint8) * 255

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        mask = cv2.dilate(mask, kernel, iterations=1)

        mean_bg = (b.astype(float) + g.astype(float)) / 2
        bool_mask = mask > 0
        r_new = r.copy()
        r_new[bool_mask] = mean_bg[bool_mask].astype(np.uint8)
        eye_roi_color[:, :, 2] = r_new

    return img_out
