import shutil
try:
    shutil.copy2("/root/.gemini/antigravity/scratch/test_despeckle_morph.jpg", "/root/sanba/frontend/public/examples/bw-after.jpg")
    print("Copy successful")
except Exception as e:
    print(f"Copy failed: {e}")
