"""Pydantic schemas for request/response validation."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Game ──

class GameBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    platform: str = ""
    year: int = 0
    description: str = ""

class GameCreate(GameBase):
    pass

class GameUpdate(BaseModel):
    name: Optional[str] = None
    platform: Optional[str] = None
    year: Optional[int] = None
    description: Optional[str] = None

class GameResponse(GameBase):
    id: int
    created_at: datetime
    updated_at: datetime
    brand_count: int = 0
    wrestler_count: int = 0

    class Config:
        from_attributes = True

class GameSummary(BaseModel):
    """Lightweight game summary for dashboard lists."""
    id: int
    name: str
    platform: str
    year: int
    brand_count: int = 0
    wrestler_count: int = 0

    class Config:
        from_attributes = True


# ── Brand ──

class BrandBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    color: str = "#5865f2"
    sort_order: int = 0
    gm: str = ""
    show_status: str = "active"

class BrandCreate(BrandBase):
    game_id: int

class BrandUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    sort_order: Optional[int] = None
    gm: Optional[str] = None
    show_status: Optional[str] = None

class BrandResponse(BrandBase):
    id: int
    game_id: int
    wrestler_count: int = 0
    championship_count: int = 0

    class Config:
        from_attributes = True


# ── Wrestler ──

class WrestlerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    gender: str = "male"
    alignment: str = "face"
    status: str = "active"
    role: str = ""
    finisher: str = ""
    power: int = Field(50, ge=1, le=100)
    is_caw: bool = False
    wins: int = 0
    losses: int = 0
    notes: str = ""

class WrestlerCreate(WrestlerBase):
    game_id: int
    brand_id: Optional[int] = None

class WrestlerUpdate(BaseModel):
    name: Optional[str] = None
    brand_id: Optional[int] = None
    gender: Optional[str] = None
    alignment: Optional[str] = None
    status: Optional[str] = None
    role: Optional[str] = None
    finisher: Optional[str] = None
    power: Optional[int] = None
    is_caw: Optional[bool] = None
    wins: Optional[int] = None
    losses: Optional[int] = None
    notes: Optional[str] = None

class WrestlerResponse(WrestlerBase):
    id: int
    game_id: int
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    game_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Tag Team ──

class TagTeamBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    member1_id: Optional[int] = None
    member2_id: Optional[int] = None
    alignment: str = "face"
    status: str = "active"
    wins: int = 0
    losses: int = 0
    notes: str = ""

class TagTeamCreate(TagTeamBase):
    game_id: int
    brand_id: Optional[int] = None

class TagTeamUpdate(BaseModel):
    name: Optional[str] = None
    brand_id: Optional[int] = None
    member1_id: Optional[int] = None
    member2_id: Optional[int] = None
    alignment: Optional[str] = None
    status: Optional[str] = None
    wins: Optional[int] = None
    losses: Optional[int] = None
    notes: Optional[str] = None

class TagTeamResponse(TagTeamBase):
    id: int
    game_id: int
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    member1_name: Optional[str] = None
    member2_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Stable ──

class StableBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    status: str = "active"
    notes: str = ""

class StableCreate(StableBase):
    game_id: int
    brand_id: Optional[int] = None
    member_ids: list[int] = []

class StableUpdate(BaseModel):
    name: Optional[str] = None
    brand_id: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    member_ids: Optional[list[int]] = None

class StableResponse(StableBase):
    id: int
    game_id: int
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    member_ids: list[int] = []
    member_names: list[str] = []

    class Config:
        from_attributes = True


# ── Championship ──

class ChampionshipBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    tier: str = "world"
    is_vacant: bool = False
    notes: str = ""

class ChampionshipCreate(ChampionshipBase):
    game_id: int
    brand_id: Optional[int] = None
    holder1_id: Optional[int] = None
    holder2_id: Optional[int] = None

class ChampionshipUpdate(BaseModel):
    name: Optional[str] = None
    brand_id: Optional[int] = None
    tier: Optional[str] = None
    holder1_id: Optional[int] = None
    holder2_id: Optional[int] = None
    is_vacant: Optional[bool] = None
    notes: Optional[str] = None

class ChampionshipResponse(ChampionshipBase):
    id: int
    game_id: int
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    holder1_id: Optional[int] = None
    holder2_id: Optional[int] = None
    holder1_name: Optional[str] = None
    holder2_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReignResponse(BaseModel):
    id: int
    championship_id: int
    holder1_id: Optional[int]
    holder2_id: Optional[int]
    holder1_name: Optional[str] = None
    holder2_name: Optional[str] = None
    date_won: datetime
    date_lost: Optional[datetime] = None
    notes: str = ""

    class Config:
        from_attributes = True


# ── Dashboard ──

class DashboardStats(BaseModel):
    total_games: int = 0
    total_brands: int = 0
    total_wrestlers: int = 0
    total_tag_teams: int = 0
    total_stables: int = 0
    total_championships: int = 0
    games: list[GameSummary] = []


# ── Bulk / Import ──

class BulkImport(BaseModel):
    games: list[GameCreate] = []
    brands: list[BrandCreate] = []
    wrestlers: list[WrestlerCreate] = []
    tag_teams: list[TagTeamCreate] = []
    stables: list[StableCreate] = []
    championships: list[ChampionshipCreate] = []

class BulkImportResponse(BaseModel):
    games_created: int = 0
    brands_created: int = 0
    wrestlers_created: int = 0
    tag_teams_created: int = 0
    stables_created: int = 0
    championships_created: int = 0
    errors: list[str] = []
