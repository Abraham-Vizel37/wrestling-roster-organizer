"""FastAPI application entry point — API routes + SPA frontend serving."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import PORT, HOST, DEV_RELOAD, FRONTEND_DIR
from app.database import init_db, engine

# ── Routers ──
from app.routers import games, brands, wrestlers, tag_teams, stables, championships, roster, io


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables. Shutdown: dispose engine."""
    await init_db()
    yield
    await engine.dispose()


app = FastAPI(
    title="Wrestling Roster Organizer",
    description="Multi-game roster management with brands, wrestlers, tag teams, stables, and championships.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── API Routes ──
app.include_router(games.router)
app.include_router(brands.router)
app.include_router(wrestlers.router)
app.include_router(tag_teams.router)
app.include_router(stables.router)
app.include_router(championships.router)
app.include_router(roster.router)
app.include_router(io.router)

# ── Static File Serving (SPA) ──
# Check API routes first, then fall through to static files.
# For client-side routing, non-file paths also serve index.html.
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=DEV_RELOAD)
