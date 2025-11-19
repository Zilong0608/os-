from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from modules.profile.router import router as profile_router
from modules.jobs.router import router as jobs_router
from modules.jd.router import router as jd_router
from modules.matching.router import router as matching_router
from modules.resume.router import router as resume_router


def create_app() -> FastAPI:
    app = FastAPI(title="Resume & Job Matching API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(profile_router, prefix="/profile", tags=["profile"])
    app.include_router(jobs_router, prefix="/jobs", tags=["jobs"])
    app.include_router(jd_router, prefix="/jd", tags=["jd"])
    app.include_router(matching_router, prefix="/matching", tags=["matching"])
    app.include_router(resume_router, prefix="/resume", tags=["resume"])

    # Serve frontend demo at /ui
    app.mount("/ui", StaticFiles(directory="apps/ui", html=True), name="ui")
    return app


app = create_app()
