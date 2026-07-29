from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.stable import Stable, stable_members
from app.schemas import (
    StableCreate, StableResponse, StableUpdate,
)
from app.models.wrestler import Wrestler

router = APIRouter(prefix="/api/stables", tags=["Stables"])


async def _enrich_stable(s: Stable) -> StableResponse:
    resp = StableResponse.model_validate(s)
    resp.brand_name = s.brand.name if s.brand else None
    resp.member_ids = [m.id for m in s.members]
    resp.member_names = [m.name for m in s.members]
    return resp


@router.get("", response_model=list[StableResponse])
async def list_stables(
    game_id: int = None,
    brand_id: int = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Stable).options(
        selectinload(Stable.brand),
        selectinload(Stable.members),
    ).order_by(Stable.name)
    if game_id:
        stmt = stmt.where(Stable.game_id == game_id)
    if brand_id:
        stmt = stmt.where(Stable.brand_id == brand_id)
    result = await db.execute(stmt)
    return [await _enrich_stable(s) for s in result.scalars().all()]


@router.post("", response_model=StableResponse, status_code=201)
async def create_stable(data: StableCreate, db: AsyncSession = Depends(get_db)):
    member_ids = data.member_ids
    data_dict = data.model_dump(exclude={"member_ids"})
    stable = Stable(**data_dict)
    if member_ids:
        result = await db.execute(select(Wrestler).where(Wrestler.id.in_(member_ids)))
        stable.members = list(result.scalars().all())
    db.add(stable)
    await db.commit()
    await db.refresh(stable, ["brand", "members"])
    return await _enrich_stable(stable)


@router.get("/{stable_id}", response_model=StableResponse)
async def get_stable(stable_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Stable).options(
            selectinload(Stable.brand),
            selectinload(Stable.members),
        ).where(Stable.id == stable_id)
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Stable not found")
    return await _enrich_stable(s)


@router.patch("/{stable_id}", response_model=StableResponse)
async def update_stable(stable_id: int, data: StableUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Stable).options(
            selectinload(Stable.brand),
            selectinload(Stable.members),
        ).where(Stable.id == stable_id)
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Stable not found")

    member_ids = data.member_ids
    data_dict = data.model_dump(exclude={"member_ids"}, exclude_unset=True)
    for key, val in data_dict.items():
        setattr(s, key, val)

    if member_ids is not None:
        result = await db.execute(select(Wrestler).where(Wrestler.id.in_(member_ids)))
        s.members = list(result.scalars().all())

    await db.commit()
    await db.refresh(s, ["brand", "members"])
    return await _enrich_stable(s)


@router.delete("/{stable_id}", status_code=204)
async def delete_stable(stable_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Stable).where(Stable.id == stable_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Stable not found")
    await db.delete(s)
    await db.commit()
