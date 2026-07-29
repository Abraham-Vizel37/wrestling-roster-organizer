from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.tag_team import TagTeam
from app.schemas import (
    TagTeamCreate, TagTeamResponse, TagTeamUpdate,
)

router = APIRouter(prefix="/api/tag-teams", tags=["Tag Teams"])


def _enrich_tag_team(t: TagTeam) -> TagTeamResponse:
    resp = TagTeamResponse.model_validate(t)
    resp.brand_name = t.brand.name if t.brand else None
    resp.member1_name = t.member1.name if t.member1 else None
    resp.member2_name = t.member2.name if t.member2 else None
    return resp


@router.get("", response_model=list[TagTeamResponse])
async def list_tag_teams(
    game_id: int = None,
    brand_id: int = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(TagTeam).options(
        selectinload(TagTeam.brand),
        selectinload(TagTeam.member1),
        selectinload(TagTeam.member2),
    ).order_by(TagTeam.name)
    if game_id:
        stmt = stmt.where(TagTeam.game_id == game_id)
    if brand_id:
        stmt = stmt.where(TagTeam.brand_id == brand_id)
    result = await db.execute(stmt)
    return [_enrich_tag_team(t) for t in result.scalars().all()]


@router.post("", response_model=TagTeamResponse, status_code=201)
async def create_tag_team(data: TagTeamCreate, db: AsyncSession = Depends(get_db)):
    team = TagTeam(**data.model_dump())
    db.add(team)
    await db.commit()
    await db.refresh(team, ["brand", "member1", "member2"])
    return _enrich_tag_team(team)


@router.get("/{team_id}", response_model=TagTeamResponse)
async def get_tag_team(team_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TagTeam).options(
            selectinload(TagTeam.brand),
            selectinload(TagTeam.member1),
            selectinload(TagTeam.member2),
        ).where(TagTeam.id == team_id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tag team not found")
    return _enrich_tag_team(t)


@router.patch("/{team_id}", response_model=TagTeamResponse)
async def update_tag_team(team_id: int, data: TagTeamUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TagTeam).options(
            selectinload(TagTeam.brand),
            selectinload(TagTeam.member1),
            selectinload(TagTeam.member2),
        ).where(TagTeam.id == team_id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tag team not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(t, key, val)
    await db.commit()
    await db.refresh(t, ["brand", "member1", "member2"])
    return _enrich_tag_team(t)


@router.delete("/{team_id}", status_code=204)
async def delete_tag_team(team_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TagTeam).where(TagTeam.id == team_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tag team not found")
    await db.delete(t)
    await db.commit()
