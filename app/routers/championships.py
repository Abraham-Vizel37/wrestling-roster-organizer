from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.championship import Championship, ChampionshipReign
from app.schemas import (
    ChampionshipCreate, ChampionshipResponse, ChampionshipUpdate,
    ReignResponse,
)

router = APIRouter(prefix="/api/championships", tags=["Championships"])


def _enrich_championship(c: Championship) -> ChampionshipResponse:
    resp = ChampionshipResponse.model_validate(c)
    resp.brand_name = c.brand.name if c.brand else None
    resp.holder1_name = c.holder1.name if c.holder1 else None
    resp.holder2_name = c.holder2.name if c.holder2 else None
    return resp


@router.get("", response_model=list[ChampionshipResponse])
async def list_championships(
    game_id: int = None,
    brand_id: int = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Championship).options(
        selectinload(Championship.brand),
        selectinload(Championship.holder1),
        selectinload(Championship.holder2),
    ).order_by(Championship.tier)
    if game_id:
        stmt = stmt.where(Championship.game_id == game_id)
    if brand_id:
        stmt = stmt.where(Championship.brand_id == brand_id)
    result = await db.execute(stmt)
    return [_enrich_championship(c) for c in result.scalars().all()]


@router.post("", response_model=ChampionshipResponse, status_code=201)
async def create_championship(data: ChampionshipCreate, db: AsyncSession = Depends(get_db)):
    champ = Championship(**data.model_dump())
    db.add(champ)
    await db.commit()
    await db.refresh(champ, ["brand", "holder1", "holder2"])
    return _enrich_championship(champ)


@router.get("/{champ_id}", response_model=ChampionshipResponse)
async def get_championship(champ_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Championship).options(
            selectinload(Championship.brand),
            selectinload(Championship.holder1),
            selectinload(Championship.holder2),
        ).where(Championship.id == champ_id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Championship not found")
    return _enrich_championship(c)


@router.patch("/{champ_id}", response_model=ChampionshipResponse)
async def update_championship(champ_id: int, data: ChampionshipUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Championship).options(
            selectinload(Championship.brand),
            selectinload(Championship.holder1),
            selectinload(Championship.holder2),
        ).where(Championship.id == champ_id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Championship not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(c, key, val)
    await db.commit()
    await db.refresh(c, ["brand", "holder1", "holder2"])
    return _enrich_championship(c)


@router.delete("/{champ_id}", status_code=204)
async def delete_championship(champ_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Championship).where(Championship.id == champ_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Championship not found")
    await db.delete(c)
    await db.commit()


# ── Reigns ──

@router.get("/{champ_id}/reigns", response_model=list[ReignResponse])
async def list_reigns(champ_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChampionshipReign).options(
            selectinload(ChampionshipReign.holder1),
            selectinload(ChampionshipReign.holder2),
        ).where(ChampionshipReign.championship_id == champ_id)
        .order_by(ChampionshipReign.date_won.desc())
    )
    reigns = []
    for r in result.scalars().all():
        resp = ReignResponse.model_validate(r)
        resp.holder1_name = r.holder1.name if r.holder1 else None
        resp.holder2_name = r.holder2.name if r.holder2 else None
        reigns.append(resp)
    return reigns


@router.post("/{champ_id}/reigns", response_model=ReignResponse, status_code=201)
async def create_reign(champ_id: int, data: ReignResponse, db: AsyncSession = Depends(get_db)):
    """Add a new reign record (for history tracking)."""
    reign = ChampionshipReign(championship_id=champ_id, **data.model_dump(exclude={"id", "holder1_name", "holder2_name"}))
    db.add(reign)
    await db.commit()
    await db.refresh(reign, ["holder1", "holder2"])
    resp = ReignResponse.model_validate(reign)
    resp.holder1_name = reign.holder1.name if reign.holder1 else None
    resp.holder2_name = reign.holder2.name if reign.holder2 else None
    return resp
