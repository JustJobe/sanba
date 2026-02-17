# NOTE: The backend application is configured to run on port 8002.
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from .database import engine
from .models import sql_job, user, incentive, activity_log, system_setting
from .routers import jobs, auth, admin

sql_job.Base.metadata.create_all(bind=engine)
user.Base.metadata.create_all(bind=engine)
incentive.Base.metadata.create_all(bind=engine)
activity_log.Base.metadata.create_all(bind=engine)
system_setting.Base.metadata.create_all(bind=engine)

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SanBa API")

# Session Middleware for Authlib (Required for OAuth)
app.add_middleware(SessionMiddleware, secret_key="super-secret-session-key")

app.mount("/files", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1/auth")
app.include_router(admin.router, prefix="/api/v1/admin")

@app.get("/")
def read_root():
    return {"message": "SanBa API is running"}
