"""CRUD helpers — reusable query patterns for all entity types."""

from typing import Optional

from sqlalchemy import select, func, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import Game
from app.models.brand import Brand
from app.models.wrestler import Wrestler
from app.models.tag_team import TagTeam
from app.models.stable import Stable, stable_members
from app.models.championship import Championship, ChampionshipReign


# ── Generic helpers ──

async def get_or_404(session: AsyncSession, model, item_id: int):
    """Fetch by ID or return None."""
    result = await session.execute(select(model).where(model.id == item_id))
    return result.scalar_one_or_none()


async def count_rows(session: AsyncSession, model, filters=None):
    """Count rows, optionally filtered."""
    stmt = select(func.count()).select_from(model)
    if filters:
        stmt = stmt.where(*filters)
    result = await session.execute(stmt)
    return result.scalar()


# ── Game ──

async def get_game_summaries(session: AsyncSession) -> list[dict]:
    """Return lightweight game summaries with counts."""
    games = await session.execute(select(Game).order_by(Game.name))
    summaries = []
    for g in games.scalars().all():
        bc = await count_rows(session, Brand, [Brand.game_id == g.id])
        wc = await count_rows(session, Wrestler, [Wrestler.game_id == g.id])
        summaries.append({
            "id": g.id,
            "name": g.name,
            "platform": g.platform,
            "year": g.year,
            "brand_count": bc,
            "wrestler_count": wc,
        })
    return summaries


# ── Wrestler ──

async def query_wrestlers(
    session: AsyncSession,
    game_id: int,
    brand_id: Optional[int] = None,
    alignment: Optional[str] = None,
    gender: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "name",
    sort_dir: str = "asc",
) -> list[Wrestler]:
    """Flexible wrestler query with filters and search."""
    stmt = select(Wrestler).where(Wrestler.game_id == game_id)

    if brand_id:
        stmt = stmt.where(Wrestler.brand_id == brand_id)
    if alignment:
        stmt = stmt.where(Wrestler.alignment == alignment)
    if gender:
        stmt = stmt.where(Wrestler.gender == gender)
    if status:
        stmt = stmt.where(Wrestler.status == status)
    if search:
        stmt = stmt.where(Wrestler.name.ilike(f"%{search}%"))

    # Sorting
    sort_col = getattr(Wrestler, sort_by, Wrestler.name)
    stmt = stmt.order_by(sort_col.asc() if sort_dir == "asc" else sort_col.desc())

    result = await session.execute(stmt)
    return list(result.scalars().all())


# ── Tag Team ──

async def get_tag_teams_for_game(session: AsyncSession, game_id: int) -> list[TagTeam]:
    result = await session.execute(
        select(TagTeam).where(TagTeam.game_id == game_id).order_by(TagTeam.name)
    )
    return list(result.scalars().all())


# ── Stable ──

async def get_stables_for_game(session: AsyncSession, game_id: int) -> list[Stable]:
    result = await session.execute(
        select(Stable).where(Stable.game_id == game_id).order_by(Stable.name)
    )
    return list(result.scalars().all())


# ── Championship ──

async def get_championships_for_game(session: AsyncSession, game_id: int) -> list[Championship]:
    result = await session.execute(
        select(Championship).where(Championship.game_id == game_id).order_by(Championship.tier)
    )
    return list(result.scalars().all())


async def get_championship_reigns(session: AsyncSession, championship_id: int) -> list[ChampionshipReign]:
    result = await session.execute(
        select(ChampionshipReign)
        .where(ChampionshipReign.championship_id == championship_id)
        .order_by(ChampionshipReign.date_won.desc())
    )
    return list(result.scalars().all())
