from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "SanBa API is running"}

def test_upload_file():
    # Simulate file upload
    files = [('files', ('test.txt', b'test content', 'text/plain'))]
    response = client.post("/api/v1/jobs/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["status"] == "queued"
    assert data["source"] == "online"

def test_get_job():
    # Create valid job first
    files = [('files', ('test2.txt', b'content', 'text/plain'))]
    create_res = client.post("/api/v1/jobs/upload", files=files)
    job_id = create_res.json()["id"]
    
    # Get it
    response = client.get(f"/api/v1/jobs/{job_id}")
    assert response.status_code == 200
    assert response.json()["id"] == job_id

def test_list_jobs():
    response = client.get("/api/v1/jobs/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_process_job():
    # 1. Create a dummy image (valid PNG)
    # 1x1 red pixel:
    # PNG signature: 89 50 4E 47 0D 0A 1A 0A
    # This is hard to fake by hand. Use cv2 to write one if possible, or just use a minimal valid bytes literal.
    # Minimal 1x1 PNG logic is complex. 
    # Let's rely on opencv being installed in the test environment to generate one.
    import cv2
    import numpy as np
    import os
    
    dummy_img = np.zeros((100, 100, 3), dtype=np.uint8)
    dummy_path = "temp_test_image.png"
    cv2.imwrite(dummy_path, dummy_img)
    
    try:
        with open(dummy_path, "rb") as f:
            files = [('files', ('test_image.png', f, 'image/png'))]
            # 2. Upload
            create_res = client.post("/api/v1/jobs/upload", files=files)
            assert create_res.status_code == 200, create_res.text
            job_id = create_res.json()["id"]
    finally:
        if os.path.exists(dummy_path):
            os.remove(dummy_path)
            
    # 3. Trigger Process
    process_res = client.post(f"/api/v1/jobs/{job_id}/process?operation=denoise")
    assert process_res.status_code == 200, process_res.text
    data = process_res.json()
    assert data["status"] == "completed"
    
    # Verify file exists? (In a real test we would check the filesystem or download endpoint)

