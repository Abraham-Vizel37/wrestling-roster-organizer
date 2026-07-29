# Architecture Council — Wrestling Roster Organizer Backend Evaluation

**Date:** 2026-07-29
**Evaluator:** Architecture Council (single-agent deliberation)
**Scope:** Evaluate 4 SQLite-backed backend candidates for the Wrestling Roster Organizer SPA → SQLite migration

---

## Executive Summary

**Winner: FastAPI + SQLAlchemy 2.0 (async) + aiosqlite** — unanimous recommendation.

The entire stack is **already installed** on this system (FastAPI 0.133.1, SQLAlchemy 2.0.51, aiosqlite 0.22.1, uvicorn 0.41.0, Python 3.11.15). Zero new dependencies needed. Combined with SQLAlchemy 2.0's async ORM, SQLite's WAL mode for concurrent reads, and FastAPI's built-in `app.frontend()` for SPA serving, this gives us a production-grade REST API with auto-generated OpenAPI docs, ACID transactions, and clean growth path to future features — all running as a single `uvicorn` process on port 8080 with a systemd unit for Hermes integration.

---

## Option-by-Option Scoring

### Option 1: FastAPI + SQLAlchemy + aiosqlite  ⭐ **RECOMMENDED**

| Criterion | Score | Notes |
|-----------|-------|-------|
| Reliability & Data Integrity | **10/10** | Full ACID via SQLite WAL mode. SQLAlchemy 2.0 async engine with `aiosqlite`. Connection pooling via `AsyncAdaptedQueuePool`. Crash recovery via WAL journal. |
| Sleek UX | **9/10** | Async endpoints mean no thread blocking on DB. Static SPA served by `app.frontend()` — FastAPI checks API routes first, then falls back to `index.html` for client-side routing. Single port (no CORS). |
| Growth Potential | **10/10** | ORM models make schema migrations trivial (Alembic-ready). Add endpoints for show booking, PPV cards, win/loss tracking via new routers. OpenAPI docs ship free. Multi-game support via URL prefix or subdomain. |
| Operational Simplicity | **9/10** | Single `uvicorn` process. Systemd unit for daemonization. Start/stop/watchdog via `systemctl`. SQLite file: zero DB admin. |
| Fit with System | **10/10** | Python 3.11.15, FastAPI, SQLAlchemy, aiosqlite, uvicorn — **all already installed**. Zero dependency install needed. |

**Overall: 9.6/10**

**Trade-offs acknowledged:**
- Requires a running server process (not truly static). However, `uvicorn` with systemd is "start it once and forget it" — negligible operational burden.
- SQLite is single-writer. For a local single-user app this is meaningless; for multi-user concurrent writes you'd need PostgreSQL. Not in scope.

**YES, adopt this option.**

---

### Option 2: sql.js (SQLite WASM in browser)

| Criterion | Score | Notes |
|-----------|-------|-------|
| Reliability & Data Integrity | **4/10** | Entire DB in browser memory. Manual save cycles (download blob or localStorage). No ACID guarantee across sessions. Crash = data loss since last save. |
| Sleek UX | **5/10** | Instant page loads (no server), but save cycles introduce latency and save prompts. ~8MB WASM binary + database in memory increases mobile memory pressure. |
| Growth Potential | **3/10** | Cannot expose a REST API. No multi-user. Import/export is file-manual. Adding show booking or win/loss tracking means re-saving entire DB each time. No server-side processing for future features like stats computation. |
| Operational Simplicity | **7/10** | No server to manage. But save-file management becomes the user's problem (download/upload cycles). |
| Fit with System | **6/10** | Runs anywhere with a browser. But wastes the existing Python/Node runtimes on this system. |

**Overall: 5.0/10**

**Killer problems:**
1. No server-side API — you can't build a mobile app, a CLI tool, or a future public API on top of it
2. Entire DB in browser memory — a phone browser on a mid-range device will struggle with anything beyond 500 wrestlers
3. Manual save cycles — the #1 reason people lose data in browser-based tools

**NO, reject this option.**

---

### Option 3: Flask + SQLite + sqlite3 stdlib

| Criterion | Score | Notes |
|-----------|-------|-------|
| Reliability & Data Integrity | **9/10** | SQLite via stdlib is ACID. Same SQLite underneath. |
| Sleek UX | **5/10** | Sync-only. Every DB call blocks the event loop. Under load (or during import/export), the API stalls for all users. No auto-generated API docs. |
| Growth Potential | **5/10** | Flask extensions exist but no built-in OpenAPI, no async, no type-based validation. Adding features means more manual boilerplate. Flask's ecosystem is in maintenance mode vs FastAPI's growth. |
| Operational Simplicity | **7/10** | Similar to FastAPI — single process. But no auto-docs means more manual API debugging. |
| Fit with System | **8/10** | sqlite3 is built into Python 3.11 stdlib. Flask is not currently installed (would need `pip install flask`). |

**Overall: 6.8/10**

**Killer problems:**
1. **Sync-only** — every DB call blocks the single thread. With FastAPI + aiosqlite, concurrent API calls don't block each other
2. **No auto-docs** — FastAPI's `/docs` endpoint is invaluable during development and for future API consumers
3. **Flask not installed** — would need `pip install flask` (minor, but FastAPI is already there)
4. **Weaker ecosystem trajectory** — Flask is mature but stagnant; FastAPI is actively developed with modern Python features

**NO, reject this option (FastAPI is strictly better in every dimension).**

---

### Option 4: Node.js + better-sqlite3

| Criterion | Score | Notes |
|-----------|-------|-------|
| Reliability & Data Integrity | **9/10** | better-sqlite3 is synchronous (good for SQLite — no write conflicts). ACID compliant. |
| Sleek UX | **7/10** | Same-language frontend/backend is appealing for JS devs. Express/Fastify serve SPA well. But no auto-generated API docs. |
| Growth Potential | **6/10** | Node.js ecosystem is mature. Adding features is straightforward. However, no built-in OpenAPI, no ORM with migration tooling (Prisma/TypeORM adds complexity). |
| Operational Simplicity | **6/10** | Requires Node.js runtime (already installed: v22.23.1). Need to install `better-sqlite3` (native module, needs build tools). Process management via systemd same as Python. |
| Fit with System | **5/10** | Node.js is available but the Hermes agent is Python-native. Future tool automation (cron backups, health checks, data migrations) must be Python or bash—adding Node.js in the middle of a Python-first system adds cognitive overhead. |

**Overall: 6.6/10**

**Killer problems:**
1. **Python-first ecosystem** — Hermes runs Python 3.11. All our automation scripts, cron jobs, and tool integrations are Python/bash. Adding a Node.js backend means maintaining two stacks.
2. **No automatic OpenAPI docs** — Fastify/Express don't ship interactive API docs. You install swagger-jsdoc, which is manual.
3. **better-sqlite3 needs native build tools** — `node-gyp` requires `python3`, `make`, and a C++ compiler. Not guaranteed on all Linux boxes.

**NO, reject this option (FastAPI is better integrated with the existing system).**

---

## Winner: FastAPI + SQLAlchemy 2.0 (async) + aiosqlite

### Chosen Tech Choices

| Choice | Decision | Rationale |
|--------|----------|-----------|
| **Web framework** | FastAPI (async) | Already installed. Auto-OpenAPI docs, Pydantic validation, async-native |
| **ORM** | SQLAlchemy 2.0 async ORM | Already installed. Declarative models, migration-ready, async session support |
| **DB driver** | aiosqlite | Already installed. Async SQLite driver, wraps pysqlite in background thread |
| **Server** | uvicorn | Already installed. ASGI server, auto-reload in dev |
| **SPA serving** | `app.frontend("/", directory="dist")` | FastAPI's built-in SPA fallback — API routes checked first, then client-side routing |
| **DB file** | Single file (`data/wrestling.db`) | Simpler than modular. SQLite supports ATTACH DATABASE if modular needed later |
| **WAL mode** | Enable via engine connect event | Critical for concurrent async reads. Prevents read-lock contention |
| **Migrations** | SQLAlchemy `create_all()` for now → Alembic later | MVP doesn't need Alembic. Add when schema changes become frequent |
| **CORS** | Disabled (same-origin via `app.frontend()`) | SPA and API served on same port. No CORS headers needed |

### File Structure Proposal

```
/root/wrestling-roster/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app, startup/shutdown, frontend mount
│   ├── config.py                # Settings (DB path, port, etc.)
│   ├── database.py              # Engine, session factory, WAL setup
│   ├── models/
│   │   ├── __init__.py
│   │   ├── game.py              # Game (WWE2K24, AEW, etc.)
│   │   ├── brand.py             # Brand/Show (Raw, SmackDown, NXT)
│   │   ├── wrestler.py          # Wrestler (core entity)
│   │   ├── tag_team.py          # Tag Teams
│   │   ├── stable.py            # Stables/Factions
│   │   └── championship.py      # Championship (6 tiers/brand)
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── game.py              # Pydantic request/response models
│   │   ├── brand.py
│   │   ├── wrestler.py
│   │   ├── tag_team.py
│   │   ├── stable.py
│   │   └── championship.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── games.py             # /api/games
│   │   ├── brands.py            # /api/brands
│   │   ├── wrestlers.py         # /api/wrestlers
│   │   ├── tag_teams.py         # /api/tag-teams
│   │   ├── stables.py           # /api/stables
│   │   ├── championships.py     # /api/championships
│   │   └── roster.py            # /api/roster (grid view, search, filter, sort)
│   └── services/
│       ├── __init__.py
│       └── export_import.py     # JSON/CSV import/export logic
├── frontend/                    # Vanilla JS SPA source
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js
│       ├── api.js               # fetch wrapper for REST calls
│       ├── components/          # UI components
│       └── utils/
├── dist/                        # Built frontend (served by FastAPI)
├── data/
│   └── wrestling.db             # SQLite database (gitignored)
├── scripts/
│   ├── start.sh                 # uvicorn launch
│   ├── backup.sh                # SQLite backup cron script
│   └── seed.py                  # Optional seed data
├── tests/
├── requirements.txt
├── pyproject.toml
└── README.md
```

### Database Design Principles

```python
# WAL mode + async engine setup (app/database.py)
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

engine = create_async_engine(
    "sqlite+aiosqlite:///./data/wrestling.db",
    echo=False,
    connect_args={"check_same_thread": False},
)

# Enable WAL mode on connect for concurrent reads
@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.close()

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
```

**Key models plan:**
- **Game** → id, name (e.g. "WWE 2K24"), platform, created_at
- **Brand** → id, game_id (FK), name (e.g. "Raw"), logo_url, created_at
- **Wrestler** → id, brand_id (FK), name, gimmick, gender, weight_class, popularity, status (active/injured/retired), notes, image_url
- **TagTeam** → id, name, wrestler1_id (FK), wrestler2_id (FK), brand_id (FK)
- **Stable** → id, name, brand_id (FK), leader_id (FK→wrestler)
- **StableMember** → stable_id (FK), wrestler_id (FK)
- **Championship** → id, brand_id (FK), name, tier (1-6), champion_id (FK→wrestler), vacant_since

### Port & Serving Strategy

| Environment | Port | Command |
|-------------|------|---------|
| **Development** | `8080` | `uvicorn app.main:app --reload --host 0.0.0.0 --port 8080` |
| **Production (systemd)** | `8080` | `uvicorn app.main:app --host 127.0.0.1 --port 8080 --workers 1` |

**Why port 8080?** Not reserved by any common service. Under 1024 (privileged) so no `sudo` needed. Node and other tools don't conflict.

**Why single worker?** SQLite supports one writer at a time. Multiple workers would queue on the write lock. Single async worker handles many concurrent requests via asyncio (non-blocking I/O).

**SPA serving:** `app.frontend("/", directory="dist")` mounts the built SPA at the root. API routes at `/api/...` are checked first; everything else falls through to `index.html` for SPA client-side routing. Single port, no CORS needed.

### Hermes Integration

#### 1. Systemd Service Unit

```ini
# /etc/systemd/system/wrestling-roster.service
[Unit]
Description=Wrestling Roster Organizer API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/wrestling-roster
ExecStart=/usr/bin/python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8080 --workers 1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### 2. Hermes Automation Scripts

**Start/Stop:**
```bash
# Start
systemctl start wrestling-roster

# Stop
systemctl stop wrestling-roster

# Restart
systemctl restart wrestling-roster

# Status
systemctl status wrestling-roster
```

**Health Check** (for Hermes cron or manual check):
```bash
# Health check
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/api/health
# Should return 200
```

**Cron Backup** (SQLite-safe backup via `.backup` command):
```bash
#!/bin/bash
# scripts/backup.sh — Run daily via cron
BACKUP_DIR="/root/wrestling-roster/data/backups"
DB="/root/wrestling-roster/data/wrestling.db"
DATE=$(date +%Y-%m-%d)
mkdir -p "$BACKUP_DIR"
sqlite3 "$DB" ".backup '$BACKUP_DIR/wrestling-$DATE.db'"
# Keep 14 days of backups
find "$BACKUP_DIR" -name "wrestling-*.db" -mtime +14 -delete
```

**Cron registration** (via Hermes cron):
```bash
cronjob action='create' name='wrestling-db-backup' \
  script='backup.sh' schedule='0 3 * * *' no_agent=true
```

**Hermes Todo/Automation Integration:**
Since Hermes runs on this same system, it can:
1. `systemctl start wrestling-roster` — start the server
2. `curl http://127.0.0.1:8080/api/health` — verify it's up
3. `systemctl restart wrestling-roster` — after a code push
4. `sqlite3 data/wrestling.db .tables` — inspect DB schema
5. `curl -X POST http://127.0.0.1:8080/api/import -F "file=@export.json"` — trigger import
6. Register a cron backup with `cronjob` as shown above

---

## Final Verdict

| Option | Verdict | Score | Why |
|--------|---------|-------|-----|
| **FastAPI + SQLAlchemy + aiosqlite** | ✅ **WINNER** | **9.6/10** | Already installed. Full ACID. Async. Auto-docs. Single-process. Python-native. Future-ready. |
| sql.js (WASM) | ❌ Reject | 5.0/10 | No server API. In-memory only. Manual saves. Poor growth. |
| Flask + sqlite3 stdlib | ❌ Reject | 6.8/10 | Sync-only. No auto-docs. Not installed. FastAPI is strictly better on every axis. |
| Node.js + better-sqlite3 | ❌ Reject | 6.6/10 | Python-first system. No auto-docs. Native build deps. Dual-stack maintenance burden. |

### Next Steps

1. Scaffold the project structure (`/root/wrestling-roster/app/`, `data/`, `frontend/`, etc.)
2. Create SQLAlchemy models for all 6 entities (Game, Brand, Wrestler, TagTeam, Stable, Championship)
3. Create FastAPI routers with CRUD endpoints
4. Build the API health/status endpoint first
5. Wire up `app.frontend()` for SPA serving
6. Set up the systemd unit
7. Register the SQLite backup cron job
