from datetime import datetime, timezone

from sqlalchemy import Integer, String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Game(Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    platform: Mapped[str] = mapped_column(String(64), default="")
    year: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    brands = relationship("Brand", back_populates="game", cascade="all, delete-orphan")
    wrestlers = relationship("Wrestler", back_populates="game", cascade="all, delete-orphan")
    tag_teams = relationship("TagTeam", back_populates="game", cascade="all, delete-orphan")
    stables = relationship("Stable", back_populates="game", cascade="all, delete-orphan")
    championships = relationship("Championship", back_populates="game", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Game {self.id}: {self.name}>"
