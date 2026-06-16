"""veloo — 연구실 도구 모음 허브"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.paper_analyzer import app as paper_app
from backend.translator import app as translate_app
from backend.arch_trainer import app as arch_app
from backend.todo import app as todo_app
from backend.contextor import app as contextor_app
from backend.todo.core.scheduler import start_scheduler, stop_scheduler
from backend.auth import router as auth_router, AuthMiddleware

BASE = os.path.dirname(__file__)
DIST = os.path.join(BASE, "frontend", "dist")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if not os.getenv("SUPABASE_URL"):
        logging.warning("SUPABASE_URL이 설정되지 않았습니다. 인증이 정상 동작하지 않을 수 있습니다.")
    if os.getenv("SMTP_USER"):
        start_scheduler()
    yield
    if os.getenv("SMTP_USER"):
        stop_scheduler()


app = FastAPI(title="Lab Toolkit", lifespan=lifespan)
app.add_middleware(AuthMiddleware)
app.include_router(auth_router)

app.mount("/paper", paper_app)
app.mount("/translate", translate_app)
app.mount("/model-review", arch_app)
app.mount("/todo", todo_app)
app.mount("/contextor", contextor_app)
app.mount("/assets", StaticFiles(directory=os.path.join(DIST, "assets")), name="assets")


@app.get("/favicon.svg")
async def favicon():
    return FileResponse(os.path.join(DIST, "favicon.svg"), media_type="image/svg+xml")


@app.get("/{full_path:path}")
async def spa(full_path: str):
    return FileResponse(os.path.join(DIST, "index.html"))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 9000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
