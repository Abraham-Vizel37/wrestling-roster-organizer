from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Brand(Base):
    __tablename__ = "brands"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    color: Mapped[str] = mapped_column(String(7), default="#5865f2")  # Hex color
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    gm: Mapped[str] = mapped_column(String(128), default="")       # General Manager
    show_status: Mapped[str] = mapped_column(String(32), default="active")  # active, inactive, archived

    # Relationships
    game = relationship("Game", back_populates="brands")
    wrestlers = relationship("Wrestler", back_populates="brand", cascade="all, delete-orphan")
    tag_teams = relationship("TagTeam", back_populates="brand", cascade="all, delete-orphan")
    stables = relationship("Stable", back_populates="brand", cascade="all, delete-orphan")
    championships = relationship("Championship", back_populates="brand", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Brand {self.id}: {self.name} (game={self.game_id})>"
