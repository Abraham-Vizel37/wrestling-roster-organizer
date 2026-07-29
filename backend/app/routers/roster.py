"""Dashboard and roster-specific endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.game import Game
from app.models.brand import Brand
from app.models.wrestler import Wrestler
from app.models.tag_team import TagTeam
from app.models.stable import Stable
from app.models.championship import Championship
from app.schemas import BulkImportResponse, DashboardStats, GameSummary, WrestlerResponse
from app.services.export_import import (
    count_rows, get_game_summaries, query_wrestlers,
)

router = APIRouter(prefix="/api", tags=["Roster & Dashboard"])


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    """Return global counts and game summaries."""
    summaries = await get_game_summaries(db)
    games_list = [GameSummary(**s) for s in summaries]
    return DashboardStats(
        total_games=len(games_list),
        total_brands=await count_rows(db, Brand),
        total_wrestlers=await count_rows(db, Wrestler),
        total_tag_teams=await count_rows(db, TagTeam),
        total_stables=await count_rows(db, Stable),
        total_championships=await count_rows(db, Championship),
        games=games_list,
    )


@router.get("/health")
async def health_check():
    """Simple health check for uptime monitoring."""
    return {"status": "ok", "service": "wrestling-roster-organizer"}


@router.get("/export/{game_id}")
async def export_game(game_id: int, db: AsyncSession = Depends(get_db)):
    """Export all data for a game as JSON."""
    from sqlalchemy.orm import selectinload

    # Game
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        return {"error": "Game not found"}

    # Brands
    result = await db.execute(select(Brand).where(Brand.game_id == game_id))
    brands = result.scalars().all()

    # Wrestlers
    result = await db.execute(select(Wrestler).where(Wrestler.game_id == game_id))
    wrestlers = result.scalars().all()

    # Tag Teams
    result = await db.execute(
        select(TagTeam).where(TagTeam.game_id == game_id)
    )
    tag_teams = result.scalars().all()

    # Stables
    result = await db.execute(
        select(Stable).options(selectinload(Stable.members))
        .where(Stable.game_id == game_id)
    )
    stables = result.scalars().all()

    # Championships
    result = await db.execute(
        select(Championship).where(Championship.game_id == game_id)
    )
    championships = result.scalars().all()

    return {
        "game": {
            "id": game.id,
            "name": game.name,
            "platform": game.platform,
            "year": game.year,
            "description": game.description,
        },
        "brands": [
            {"id": b.id, "name": b.name, "color": b.color, "sort_order": b.sort_order, "gm": b.gm}
            for b in brands
        ],
        "wrestlers": [
            {
                "id": w.id, "brand_id": w.brand_id, "name": w.name,
                "gender": w.gender, "alignment": w.alignment, "status": w.status,
                "role": w.role, "finisher": w.finisher, "power": w.power,
                "is_caw": w.is_caw, "wins": w.wins, "losses": w.losses, "notes": w.notes,
            }
            for w in wrestlers
        ],
        "tag_teams": [
            {
                "id": t.id, "brand_id": t.brand_id, "name": t.name,
                "member1_id": t.member1_id, "member2_id": t.member2_id,
                "alignment": t.alignment, "status": t.status,
                "wins": t.wins, "losses": t.losses,
            }
            for t in tag_teams
        ],
        "stables": [
            {
                "id": s.id, "brand_id": s.brand_id, "name": s.name,
                "status": s.status, "member_ids": [m.id for m in s.members],
            }
            for s in stables
        ],
        "championships": [
            {
                "id": c.id, "brand_id": c.brand_id, "name": c.name,
                "tier": c.tier, "holder1_id": c.holder1_id,
                "holder2_id": c.holder2_id, "is_vacant": c.is_vacant,
            }
            for c in championships
        ],
    }


@router.post("/import", status_code=201)
async def import_game(data: dict, db: AsyncSession = Depends(get_db)):
    """Import game data from a previously exported JSON blob."""
    from sqlalchemy import select as sa_select
    errors = []

    # Determine game name from import
    game_data = data.get("game", {})
    if not game_data.get("name"):
        raise HTTPException(400, "Import data must contain a 'game' object with a 'name' field.")

    # Create or skip game (by name)
    existing = await db.execute(sa_select(Game).where(Game.name == game_data["name"]))
    existing_game = existing.scalar_one_or_none()
    if existing_game:
        game = existing_game
        game_created = 0
    else:
        game = Game(
            name=game_data["name"],
            platform=game_data.get("platform", ""),
            year=game_data.get("year", 0),
            description=game_data.get("description", ""),
        )
        db.add(game)
        await db.flush()
        game_created = 1

    # Brands
    brand_id_map = {}  # old brand_id -> new brand_id
    brand_count = 0
    for b in data.get("brands", []):
        existing = await db.execute(
            sa_select(Brand).where(Brand.game_id == game.id, Brand.name == b["name"])
        )
        existing_b = existing.scalar_one_or_none()
        if existing_b:
            brand_id_map[b["id"]] = existing_b.id
        else:
            nb = Brand(
                game_id=game.id,
                name=b["name"],
                color=b.get("color", "#5865f2"),
                sort_order=b.get("sort_order", 0),
                gm=b.get("gm", ""),
            )
            db.add(nb)
            await db.flush()
            brand_id_map[b["id"]] = nb.id
            brand_count += 1

    # Wrestlers
    wrestler_id_map = {}
    wrestler_count = 0
    for w in data.get("wrestlers", []):
        nb_id = brand_id_map.get(w.get("brand_id")) if w.get("brand_id") else None
        nw = Wrestler(
            game_id=game.id,
            brand_id=nb_id,
            name=w["name"],
            gender=w.get("gender", "male"),
            alignment=w.get("alignment", "face"),
            status=w.get("status", "active"),
            role=w.get("role", ""),
            finisher=w.get("finisher", ""),
            power=w.get("power", 50),
            is_caw=w.get("is_caw", False),
            wins=w.get("wins", 0),
            losses=w.get("losses", 0),
            notes=w.get("notes", ""),
        )
        db.add(nw)
        await db.flush()
        wrestler_id_map[w["id"]] = nw.id
        wrestler_count += 1

    # Tag Teams
    tag_count = 0
    for t in data.get("tag_teams", []):
        nt = TagTeam(
            game_id=game.id,
            brand_id=brand_id_map.get(t.get("brand_id")),
            name=t["name"],
            member1_id=wrestler_id_map.get(t.get("member1_id")),
            member2_id=wrestler_id_map.get(t.get("member2_id")),
            alignment=t.get("alignment", "face"),
            status=t.get("status", "active"),
            wins=t.get("wins", 0),
            losses=t.get("losses", 0),
        )
        db.add(nt)
        tag_count += 1

    # Stables
    stable_count = 0
    for s in data.get("stables", []):
        member_ids = [wrestler_id_map.get(mid) for mid in s.get("member_ids", []) if mid in wrestler_id_map]
        ns = Stable(
            game_id=game.id,
            brand_id=brand_id_map.get(s.get("brand_id")),
            name=s["name"],
            status=s.get("status", "active"),
        )
        if member_ids:
            result = await db.execute(sa_select(Wrestler).where(Wrestler.id.in_(member_ids)))
            ns.members = list(result.scalars().all())
        db.add(ns)
        stable_count += 1

    # Championships
    champ_count = 0
    for c in data.get("championships", []):
        nc = Championship(
            game_id=game.id,
            brand_id=brand_id_map.get(c.get("brand_id")),
            name=c["name"],
            tier=c.get("tier", "world"),
            holder1_id=wrestler_id_map.get(c.get("holder1_id")),
            holder2_id=wrestler_id_map.get(c.get("holder2_id")),
            is_vacant=c.get("is_vacant", False),
        )
        db.add(nc)
        champ_count += 1

    await db.commit()
    return BulkImportResponse(
        games_created=game_created,
        brands_created=brand_count,
        wrestlers_created=wrestler_count,
        tag_teams_created=tag_count,
        stables_created=stable_count,
        championships_created=champ_count,
        errors=errors,
    )
