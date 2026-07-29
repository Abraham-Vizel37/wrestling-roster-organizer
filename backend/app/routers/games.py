from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.game import Game
from app.schemas import (
    GameCreate, GameResponse, GameSummary, GameUpdate,
)
from app.services.export_import import count_rows, get_game_summaries
from app.models.brand import Brand
from app.models.wrestler import Wrestler

router = APIRouter(prefix="/api/games", tags=["Games"])


@router.get("", response_model=list[GameSummary])
async def list_games(db: AsyncSession = Depends(get_db)):
    """List all games with brand/wrestler counts."""
    return await get_game_summaries(db)


@router.post("", response_model=GameResponse, status_code=201)
async def create_game(data: GameCreate, db: AsyncSession = Depends(get_db)):
    """Create a new game."""
    game = Game(**data.model_dump())
    db.add(game)
    await db.commit()
    await db.refresh(game)
    game.brand_count = 0
    game.wrestler_count = 0
    return game


@router.get("/{game_id}", response_model=GameResponse)
async def get_game(game_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single game with counts."""
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")
    bc = await count_rows(db, Brand, [Brand.game_id == game.id])
    wc = await count_rows(db, Wrestler, [Wrestler.game_id == game.id])
    game.brand_count = bc
    game.wrestler_count = wc
    return game


@router.patch("/{game_id}", response_model=GameResponse)
async def update_game(game_id: int, data: GameUpdate, db: AsyncSession = Depends(get_db)):
    """Update a game."""
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(game, key, val)
    game.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(game)
    bc = await count_rows(db, Brand, [Brand.game_id == game.id])
    wc = await count_rows(db, Wrestler, [Wrestler.game_id == game.id])
    game.brand_count = bc
    game.wrestler_count = wc
    return game


@router.delete("/{game_id}", status_code=204)
async def delete_game(game_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a game and all its children (CASCADE)."""
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")
    await db.delete(game)
    await db.commit()
