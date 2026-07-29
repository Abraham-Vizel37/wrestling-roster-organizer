from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.wrestler import Wrestler
from app.models.brand import Brand
from app.schemas import (
    WrestlerCreate, WrestlerResponse, WrestlerUpdate,
)
from app.services.export_import import query_wrestlers

router = APIRouter(prefix="/api/wrestlers", tags=["Wrestlers"])


@router.get("", response_model=list[WrestlerResponse])
async def list_wrestlers(
    game_id: int = Query(..., description="Required: game ID"),
    brand_id: int = None,
    alignment: str = None,
    gender: str = None,
    status: str = None,
    search: str = None,
    sort_by: str = "name",
    sort_dir: str = "asc",
    db: AsyncSession = Depends(get_db),
):
    """List wrestlers with filters, search, and sorting."""
    wrestlers = await query_wrestlers(
        db, game_id=game_id, brand_id=brand_id,
        alignment=alignment, gender=gender, status=status,
        search=search, sort_by=sort_by, sort_dir=sort_dir,
    )
    # Enrich with brand/game names
    results = []
    for w in wrestlers:
        resp = WrestlerResponse.model_validate(w)
        if w.brand:
            resp.brand_name = w.brand.name
        if w.game:
            resp.game_name = w.game.name
        results.append(resp)
    return results


@router.post("", response_model=WrestlerResponse, status_code=201)
async def create_wrestler(data: WrestlerCreate, db: AsyncSession = Depends(get_db)):
    wrestler = Wrestler(**data.model_dump())
    db.add(wrestler)
    await db.commit()
    await db.refresh(wrestler, ["brand", "game"])
    resp = WrestlerResponse.model_validate(wrestler)
    if wrestler.brand:
        resp.brand_name = wrestler.brand.name
    if wrestler.game:
        resp.game_name = wrestler.game.name
    return resp


@router.get("/{wrestler_id}", response_model=WrestlerResponse)
async def get_wrestler(wrestler_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Wrestler).options(selectinload(Wrestler.brand)).where(Wrestler.id == wrestler_id)
    )
    w = result.scalar_one_or_none()
    if not w:
        raise HTTPException(404, "Wrestler not found")
    resp = WrestlerResponse.model_validate(w)
    if w.brand:
        resp.brand_name = w.brand.name
    if w.game:
        resp.game_name = w.game.name
    return resp


@router.patch("/{wrestler_id}", response_model=WrestlerResponse)
async def update_wrestler(wrestler_id: int, data: WrestlerUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Wrestler).options(selectinload(Wrestler.brand)).where(Wrestler.id == wrestler_id)
    )
    w = result.scalar_one_or_none()
    if not w:
        raise HTTPException(404, "Wrestler not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(w, key, val)
    w.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(w, ["brand", "game"])
    resp = WrestlerResponse.model_validate(w)
    if w.brand:
        resp.brand_name = w.brand.name
    if w.game:
        resp.game_name = w.game.name
    return resp


@router.delete("/{wrestler_id}", status_code=204)
async def delete_wrestler(wrestler_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Wrestler).where(Wrestler.id == wrestler_id))
    w = result.scalar_one_or_none()
    if not w:
        raise HTTPException(404, "Wrestler not found")
    await db.delete(w)
    await db.commit()
