"""Import/Export, sample templates, and database info endpoints.

Supports:
- Full game export/import (single JSON blob, ID remapping)
- Category-specific export/import (brands, wrestlers, tag-teams, stables, championships)
- Sample JSON template downloads for each category
- Database metadata (schema info, WAL mode, table stats)
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy import select, text, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.brand import Brand
from app.models.championship import Championship
from app.models.game import Game
from app.models.stable import Stable
from app.models.tag_team import TagTeam
from app.models.wrestler import Wrestler
from app.schemas import BulkImportResponse, GameResponse

router = APIRouter(prefix="/api", tags=["Import / Export / Templates"])

CATEGORIES = ["brands", "wrestlers", "tag-teams", "stables", "championships"]

VALID_CATEGORIES = {
    "brands": Brand,
    "wrestlers": Wrestler,
    "tag-teams": TagTeam,
    "stables": Stable,
    "championships": Championship,
}

MODEL_TO_CATEGORY = {v: k for k, v in VALID_CATEGORIES.items()}


# ── HELPERS ──

def _to_dict(instance, fields: dict) -> dict:
    """Convert a SQLAlchemy model instance to a clean dict using only specified fields."""
    result = {}
    for key, default in fields.items():
        val = getattr(instance, key, default)
        if isinstance(val, datetime):
            val = val.isoformat()
        if isinstance(val, bool):
            val = bool(val)
        result[key] = val
    return result


def _sanitize_for_export(item: dict) -> dict:
    """Remove internal IDs and fields that would break import."""
    safe = {}
    for k, v in item.items():
        if k in ("id", "created_at", "updated_at", "game_id", "game_name", "brand_name",
                 "member1_name", "member2_name", "member_names", "wrestler_count",
                 "championship_count", "brand_count", "holder1_name", "holder2_name"):
            continue
        safe[k] = v
    return safe


# ── SAMPLES ──

SAMPLE_TEMPLATES = {
    "full-game": {
        "game": {
            "name": "WWE 2K24",
            "platform": "Multi (PS5/Xbox/PC)",
            "year": 2024,
            "description": "Optional game description"
        },
        "brands": [
            {"name": "RAW", "color": "#e02424", "sort_order": 1, "gm": "Adam Pearce"},
            {"name": "SmackDown", "color": "#005baa", "sort_order": 2, "gm": "Nick Aldis"},
            {"name": "NXT", "color": "#ffd700", "sort_order": 3, "gm": "Ava"}
        ],
        "wrestlers": [
            {"brand_id": "RAW", "name": "Cody Rhodes", "gender": "male",
             "alignment": "face", "status": "active", "power": 95, "role": "Main Event",
             "finisher": "Cross Rhodes", "is_caw": False, "wins": 0, "losses": 0},
            {"brand_id": "SmackDown", "name": "Roman Reigns", "gender": "male",
             "alignment": "heel", "status": "active", "power": 98, "is_caw": False}
        ],
        "tag_teams": [
            {"name": "Usos", "brand_id": "SmackDown", "member1": "Jey Uso",
             "member2": "Jimmy Uso", "alignment": "face", "status": "active"}
        ],
        "stables": [
            {"name": "Bloodline", "brand_id": "SmackDown",
             "members": ["Roman Reigns", "Jimmy Uso", "Solo Sikoa", "The Rock"],
             "status": "active"}
        ],
        "championships": [
            {"name": "WWE Championship", "brand_id": "SmackDown", "tier": "world",
             "holder1": "Roman Reigns", "is_vacant": False},
            {"name": "World Heavyweight Championship", "brand_id": "RAW",
             "tier": "world", "is_vacant": True}
        ]
    },
    "brands": [
        {"name": "RAW", "game": "WWE 2K24", "color": "#e02424", "sort_order": 1, "gm": "Adam Pearce"},
        {"name": "SmackDown", "game": "WWE 2K24", "color": "#005baa", "sort_order": 2, "gm": "Nick Aldis"}
    ],
    "wrestlers": [
        {"name": "Cody Rhodes", "game": "WWE 2K24", "brand": "RAW",
         "gender": "male", "alignment": "face", "status": "active", "power": 95,
         "role": "Main Event", "finisher": "Cross Rhodes", "is_caw": False},
        {"name": "Roman Reigns", "game": "WWE 2K24", "brand": "SmackDown",
         "gender": "male", "alignment": "heel", "status": "active", "power": 98}
    ],
    "tag-teams": [
        {"name": "Usos", "game": "WWE 2K24", "brand": "SmackDown",
         "member1": "Jey Uso", "member2": "Jimmy Uso",
         "alignment": "face", "status": "active"},
        {"name": "Awesome Truth", "game": "WWE 2K24", "brand": "RAW",
         "member1": "Miz", "member2": "R-Truth", "alignment": "face", "status": "active"}
    ],
    "stables": [
        {"name": "Bloodline", "game": "WWE 2K24", "brand": "SmackDown",
         "members": ["Roman Reigns", "Jimmy Uso", "Solo Sikoa", "The Rock"],
         "status": "active"},
        {"name": "Judgment Day", "game": "WWE 2K24", "brand": "RAW",
         "members": ["Finn Balor", "Damien Priest", "Dominik Mysterio", "Rhea Ripley"],
         "status": "active"}
    ],
    "championships": [
        {"name": "WWE Championship", "game": "WWE 2K24", "brand": "SmackDown",
         "tier": "world", "holder1": "Roman Reigns", "is_vacant": False},
        {"name": "Intercontinental Championship", "game": "WWE 2K24", "brand": "SmackDown",
         "tier": "midcard", "holder1": "Gunther", "is_vacant": False},
        {"name": "WWE Women's Championship", "game": "WWE 2K24", "brand": "SmackDown",
         "tier": "womens_world", "holder1": "Bayley", "is_vacant": False}
    ],
}


@router.get("/samples")
async def list_samples():
    """List all available sample templates."""
    return {
        "categories": list(SAMPLE_TEMPLATES.keys()),
        "endpoint": "/api/samples/{category}",
        "download": "/api/samples/{category}/download",
    }


@router.get("/samples/{category}")
async def get_sample(category: str):
    """Get a sample JSON template for the given category."""
    if category not in SAMPLE_TEMPLATES:
        raise HTTPException(404, f"Unknown category '{category}'. Options: {list(SAMPLE_TEMPLATES.keys())}")
    return SAMPLE_TEMPLATES[category]


@router.get("/samples/{category}/download")
async def download_sample(category: str):
    """Download a sample JSON template as a file."""
    if category not in SAMPLE_TEMPLATES:
        raise HTTPException(404, f"Unknown category '{category}'. Options: {list(SAMPLE_TEMPLATES.keys())}")
    import json
    content = json.dumps(SAMPLE_TEMPLATES[category], indent=2)
    filename = f"wrestling-roster-sample-{category}.json"
    return PlainTextResponse(
        content=content,
        headers={
            "Content-Type": "application/json",
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


# ── EXPORT ──

@router.get("/export/{game_id}")
async def export_game(
    game_id: int,
    category: str = Query(None, description="Filter by category: brands, wrestlers, tag-teams, stables, championships"),
    db: AsyncSession = Depends(get_db),
):
    """Export game data as JSON. Optionally filter by category."""
    from sqlalchemy.orm import selectinload

    # Verify game exists
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")

    game_out = _to_dict(game, {"id": None, "name": "", "platform": "", "year": 0, "description": ""})

    # Brands
    if category is None or category == "brands":
        result = await db.execute(select(Brand).where(Brand.game_id == game_id))
        brands = [_to_dict(b, {"id": None, "name": "", "color": "", "sort_order": 0, "gm": ""}) for b in result.scalars().all()]
    else:
        brands = []

    # Wrestlers (with brand_name lookup)
    if category is None or category == "wrestlers":
        result = await db.execute(
            select(Wrestler, Brand.name.label("_brand_name"))
            .outerjoin(Brand, Wrestler.brand_id == Brand.id)
            .where(Wrestler.game_id == game_id)
        )
        rows = result.all()
        wrestlers = []
        for w, _bn in rows:
            wd = _to_dict(w, {"id": None, "brand_id": None, "name": "", "gender": "", "alignment": "",
                               "status": "", "role": "", "finisher": "", "power": 50,
                               "is_caw": False, "wins": 0, "losses": 0, "notes": ""})
            wd["brand_name"] = _bn or ""
            wrestlers.append(wd)
    else:
        wrestlers = []

    # Tag Teams (with member names)
    if category is None or category == "tag-teams":
        result = await db.execute(
            select(TagTeam).where(TagTeam.game_id == game_id)
        )
        tag_teams_raw = result.scalars().all()

        # Fetch member names in one batch
        member_ids = set()
        for t in tag_teams_raw:
            if t.member1_id:
                member_ids.add(t.member1_id)
            if t.member2_id:
                member_ids.add(t.member2_id)
        member_names = {}
        if member_ids:
            result = await db.execute(select(Wrestler.id, Wrestler.name).where(Wrestler.id.in_(member_ids)))
            member_names = {row[0]: row[1] for row in result.all()}

        tag_teams = []
        for t in tag_teams_raw:
            td = _to_dict(t, {"id": None, "brand_id": None, "name": "", "member1_id": None,
                              "member2_id": None, "alignment": "", "status": "",
                              "wins": 0, "losses": 0})
            td["member1_name"] = member_names.get(t.member1_id, "")
            td["member2_name"] = member_names.get(t.member2_id, "")
            tag_teams.append(td)
    else:
        tag_teams = []

    # Stables (with member names)
    if category is None or category == "stables":
        result = await db.execute(
            select(Stable).options(selectinload(Stable.members))
            .where(Stable.game_id == game_id)
        )
        stables_raw = result.scalars().all()
        stables = [
            _to_dict(s, {"id": None, "brand_id": None, "name": "", "status": ""})
            | {"member_names": [m.name for m in s.members]}
            for s in stables_raw
        ]
    else:
        stables = []

    # Championships (with holder names)
    if category is None or category == "championships":
        result = await db.execute(
            select(Championship).where(Championship.game_id == game_id)
        )
        champs_raw = result.scalars().all()

        holder_ids = set()
        for c in champs_raw:
            if c.holder1_id:
                holder_ids.add(c.holder1_id)
            if c.holder2_id:
                holder_ids.add(c.holder2_id)
        holder_names = {}
        if holder_ids:
            result = await db.execute(select(Wrestler.id, Wrestler.name).where(Wrestler.id.in_(holder_ids)))
            holder_names = {row[0]: row[1] for row in result.all()}

        championships = []
        for c in champs_raw:
            cd = _to_dict(c, {"id": None, "brand_id": None, "name": "", "tier": "",
                              "holder1_id": None, "holder2_id": None, "is_vacant": False})
            cd["holder1_name"] = holder_names.get(c.holder1_id, "")
            cd["holder2_name"] = holder_names.get(c.holder2_id, "")
            championships.append(cd)
    else:
        championships = []

    return {
        "game": game_out,
        "brands": brands,
        "wrestlers": wrestlers,
        "tag_teams": tag_teams,
        "stables": stables,
        "championships": championships,
    }


# ── IMPORT ──

async def _resolve_game_ref(db, ref):
    """Resolve a game reference — pass int game_id or str game name."""
    from sqlalchemy import select as sa_select
    if isinstance(ref, int):
        result = await db.execute(sa_select(Game).where(Game.id == ref))
        game = result.scalar_one_or_none()
        if not game:
            raise HTTPException(400, f"Game with id={ref} not found")
        return game
    if isinstance(ref, str):
        result = await db.execute(sa_select(Game).where(Game.name == ref))
        game = result.scalar_one_or_none()
        if game:
            return game
        # Auto-create game by name
        game = Game(name=ref, platform="Imported", year=datetime.now(timezone.utc).year)
        # async session, need to add and flush
        return game
    raise HTTPException(400, "game must be an int (ID) or str (name)")


async def _resolve_brand_ref(db, game_id, ref):
    """Resolve a brand reference — pass int brand_id or str brand name."""
    from sqlalchemy import select as sa_select
    if isinstance(ref, int):
        result = await db.execute(sa_select(Brand).where(Brand.id == ref, Brand.game_id == game_id))
        b = result.scalar_one_or_none()
        if not b:
            raise HTTPException(400, f"Brand id={ref} not found in game {game_id}")
        return b.id
    if isinstance(ref, str):
        result = await db.execute(sa_select(Brand).where(Brand.name == ref, Brand.game_id == game_id))
        b = result.scalar_one_or_none()
        if not b:
            raise HTTPException(400, f"Brand '{ref}' not found in game {game_id}. Create it first via /api/brands")
        return b.id
    return None


async def _resolve_wrestler_ref(db, game_id, ref):
    """Resolve a wrestler reference — pass int id or str name."""
    from sqlalchemy import select as sa_select
    if isinstance(ref, int):
        result = await db.execute(sa_select(Wrestler).where(Wrestler.id == ref, Wrestler.game_id == game_id))
        w = result.scalar_one_or_none()
        return w.id if w else None
    if isinstance(ref, str):
        result = await db.execute(
            sa_select(Wrestler).where(Wrestler.name == ref, Wrestler.game_id == game_id)
        )
        w = result.scalar_one_or_none()
        return w.id if w else None
    return None


@router.post("/import", status_code=201)
async def import_game(
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """Import complete game data from exported JSON blob. Full round-trip safe."""
    from sqlalchemy import select as sa_select
    errors = []

    game_data = data.get("game", {})
    if not game_data.get("name"):
        raise HTTPException(400, "Import data must contain a 'game' object with a 'name' field.")

    # Create or skip game
    existing = await db.execute(sa_select(Game).where(Game.name == game_data["name"]))
    existing_game = existing.scalar_one_or_none()
    if existing_game:
        game = existing_game
        game_created = False
    else:
        game = Game(
            name=game_data["name"],
            platform=game_data.get("platform", ""),
            year=game_data.get("year", datetime.now(timezone.utc).year),
            description=game_data.get("description", ""),
        )
        db.add(game)
        await db.flush()
        game_created = True

    brand_id_map = {}
    brand_count = 0
    for b in data.get("brands", []):
        existing = await db.execute(
            sa_select(Brand).where(Brand.game_id == game.id, Brand.name == b["name"])
        )
        existing_b = existing.scalar_one_or_none()
        if existing_b:
            brand_id_map[b.get("id", b["name"])] = existing_b.id
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
            brand_id_map[b.get("id", b["name"])] = nb.id
            brand_count += 1

    wrestler_id_map = {}
    wrestler_count = 0
    for w in data.get("wrestlers", []):
        nb_id = brand_id_map.get(w.get("brand_id")) if w.get("brand_id") else None
        if not nb_id and w.get("brand_name"):
            nb_id = brand_id_map.get(w["brand_name"])

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
        wrestler_id_map[w.get("id", w["name"])] = nw.id
        wrestler_count += 1

    tag_count = 0
    for t in data.get("tag_teams", []):
        m1_id = wrestler_id_map.get(t.get("member1_id")) or wrestler_id_map.get(t.get("member1_name", ""))
        m2_id = wrestler_id_map.get(t.get("member2_id")) or wrestler_id_map.get(t.get("member2_name", ""))
        if not m1_id and t.get("member1_name"):
            m1_id = await _resolve_wrestler_ref(db, game.id, t["member1_name"])
        if not m2_id and t.get("member2_name"):
            m2_id = await _resolve_wrestler_ref(db, game.id, t["member2_name"])

        nt = TagTeam(
            game_id=game.id,
            brand_id=brand_id_map.get(t.get("brand_id")) or brand_id_map.get(t.get("brand_name", "")),
            name=t["name"],
            member1_id=m1_id,
            member2_id=m2_id,
            alignment=t.get("alignment", "face"),
            status=t.get("status", "active"),
            wins=t.get("wins", 0),
            losses=t.get("losses", 0),
        )
        db.add(nt)
        tag_count += 1

    stable_count = 0
    for s in data.get("stables", []):
        member_ids = []
        for ref in s.get("member_ids", []):
            if ref in wrestler_id_map:
                member_ids.append(wrestler_id_map[ref])
        for name in s.get("member_names", []):
            wid = wrestler_id_map.get(name) or await _resolve_wrestler_ref(db, game.id, name)
            if wid and wid not in member_ids:
                member_ids.append(wid)

        ns = Stable(
            game_id=game.id,
            brand_id=brand_id_map.get(s.get("brand_id")) or brand_id_map.get(s.get("brand_name", "")),
            name=s["name"],
            status=s.get("status", "active"),
        )
        if member_ids:
            result = await db.execute(sa_select(Wrestler).where(Wrestler.id.in_(member_ids)))
            ns.members = list(result.scalars().all())
        db.add(ns)
        stable_count += 1

    champ_count = 0
    for c in data.get("championships", []):
        h1_id = wrestler_id_map.get(c.get("holder1_id")) or wrestler_id_map.get(c.get("holder1_name", ""))
        h2_id = wrestler_id_map.get(c.get("holder2_id")) or wrestler_id_map.get(c.get("holder2_name", ""))
        if not h1_id and c.get("holder1_name"):
            h1_id = await _resolve_wrestler_ref(db, game.id, c["holder1_name"])
        if not h2_id and c.get("holder2_name"):
            h2_id = await _resolve_wrestler_ref(db, game.id, c["holder2_name"])

        nc = Championship(
            game_id=game.id,
            brand_id=brand_id_map.get(c.get("brand_id")) or brand_id_map.get(c.get("brand_name", "")),
            name=c["name"],
            tier=c.get("tier", "world"),
            holder1_id=h1_id,
            holder2_id=h2_id,
            is_vacant=c.get("is_vacant", False),
        )
        db.add(nc)
        champ_count += 1

    await db.commit()

    verb = "Created" if game_created else "Matched"
    return BulkImportResponse(
        games_created=1 if game_created else 0,
        brands_created=brand_count,
        wrestlers_created=wrestler_count,
        tag_teams_created=tag_count,
        stables_created=stable_count,
        championships_created=champ_count,
        errors=errors,
    )


# ── CATEGORY-SPECIFIC IMPORT ──

@router.post("/import/{game_id}/{category}")
async def import_category(
    game_id: int,
    category: str,
    items: list[dict],
    db: AsyncSession = Depends(get_db),
):
    """Import items for a single category into an existing game.

    Categories: brands, wrestlers, tag-teams, stables, championships.
    Items use string references (name-based) for foreign keys —
    e.g. {'name': 'Cody Rhodes', 'brand': 'RAW', 'game': 'WWE 2K24'}.
    """
    from sqlalchemy import select as sa_select

    if category not in VALID_CATEGORIES:
        raise HTTPException(400, f"Unknown category '{category}'. Valid: {list(VALID_CATEGORIES.keys())}")

    # Verify game
    result = await db.execute(sa_select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(404, f"Game id={game_id} not found")

    MODEL = VALID_CATEGORIES[category]
    count = 0
    errors = []

    for item in items:
        try:
            if category == "brands":
                existing = await db.execute(
                    sa_select(Brand).where(Brand.game_id == game_id, Brand.name == item["name"])
                )
                if existing.scalar_one_or_none():
                    errors.append(f"Brand '{item['name']}' already exists — skipped")
                    continue
                obj = Brand(
                    game_id=game_id,
                    name=item["name"],
                    color=item.get("color", "#5865f2"),
                    sort_order=item.get("sort_order", 0),
                    gm=item.get("gm", ""),
                )

            elif category == "wrestlers":
                brand_id = None
                if item.get("brand"):
                    brand_id = await _resolve_brand_ref(db, game_id, item["brand"])
                obj = Wrestler(
                    game_id=game_id,
                    brand_id=brand_id,
                    name=item["name"],
                    gender=item.get("gender", "male"),
                    alignment=item.get("alignment", "face"),
                    status=item.get("status", "active"),
                    role=item.get("role", ""),
                    finisher=item.get("finisher", ""),
                    power=item.get("power", 50),
                    is_caw=item.get("is_caw", False),
                    wins=item.get("wins", 0),
                    losses=item.get("losses", 0),
                    notes=item.get("notes", ""),
                )

            elif category == "tag-teams":
                m1 = await _resolve_wrestler_ref(db, game_id, item.get("member1", ""))
                m2 = await _resolve_wrestler_ref(db, game_id, item.get("member2", ""))
                brand_id = None
                if item.get("brand"):
                    brand_id = await _resolve_brand_ref(db, game_id, item["brand"])
                obj = TagTeam(
                    game_id=game_id,
                    brand_id=brand_id,
                    name=item["name"],
                    member1_id=m1,
                    member2_id=m2,
                    alignment=item.get("alignment", "face"),
                    status=item.get("status", "active"),
                )

            elif category == "stables":
                brand_id = None
                if item.get("brand"):
                    brand_id = await _resolve_brand_ref(db, game_id, item["brand"])
                obj = Stable(
                    game_id=game_id,
                    brand_id=brand_id,
                    name=item["name"],
                    status=item.get("status", "active"),
                )
                # Resolve members after flush
                member_names = item.get("members", [])
                if member_names:
                    result = await db.execute(
                        sa_select(Wrestler).where(
                            Wrestler.game_id == game_id,
                            Wrestler.name.in_(member_names),
                        )
                    )
                    # Can't set on obj until flushed
                    obj._pending_member_names = member_names

            elif category == "championships":
                h1 = await _resolve_wrestler_ref(db, game_id, item.get("holder1", ""))
                h2 = await _resolve_wrestler_ref(db, game_id, item.get("holder2", ""))
                brand_id = None
                if item.get("brand"):
                    brand_id = await _resolve_brand_ref(db, game_id, item["brand"])
                obj = Championship(
                    game_id=game_id,
                    brand_id=brand_id,
                    name=item["name"],
                    tier=item.get("tier", "world"),
                    holder1_id=h1,
                    holder2_id=h2,
                    is_vacant=item.get("is_vacant", False),
                )

            db.add(obj)
            await db.flush()

            # Handle stable members post-flush
            if category == "stables" and hasattr(obj, "_pending_member_names"):
                result = await db.execute(
                    sa_select(Wrestler).where(
                        Wrestler.game_id == game_id,
                        Wrestler.name.in_(obj._pending_member_names),
                    )
                )
                obj.members = list(result.scalars().all())
                del obj._pending_member_names

            count += 1

        except Exception as e:
            errors.append(f"Item '{item.get('name', '?')}': {str(e)}")

    await db.commit()
    return {
        "imported": count,
        "errors": errors,
        "category": category,
        "total_items": len(items),
    }


# ── DATABASE INFO ──

@router.get("/db/info")
async def db_info(db: AsyncSession = Depends(get_db)):
    """Get database schema and integrity information."""
    # Table row counts
    tables = {}
    for model_cls, cat_name in [(Game, "games"), (Brand, "brands"), (Wrestler, "wrestlers"),
                                  (TagTeam, "tag_teams"), (Stable, "stables"),
                                  (Championship, "championships")]:
        result = await db.execute(select(func.count()).select_from(model_cls))
        tables[cat_name] = result.scalar() or 0

    # Get WAL mode from SQLite
    pragmas = {}
    for pragma in ("journal_mode", "application_id", "user_version", "page_count", "page_size", "total_changes"):
        try:
            result = await db.execute(text(f"PRAGMA {pragma}"))
            rows = result.all()
            if rows:
                pragmas[pragma] = str(rows[0][0])
        except Exception:
            pass

    # Schema dump (CREATE TABLE statements)
    result = await db.execute(
        text("SELECT sql FROM sqlite_master WHERE type='table' AND sql IS NOT NULL ORDER BY name")
    )
    schema = [row[0] for row in result.all()]

    return {
        "engine": "SQLite (aiosqlite + aiosqlite + WAL)",
        "row_counts": tables,
        "pragmas": pragmas,
        "tables": len(schema),
        "schema_sql": schema,
    }
