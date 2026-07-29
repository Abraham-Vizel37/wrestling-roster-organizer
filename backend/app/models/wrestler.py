from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Wrestler(Base):
    __tablename__ = "wrestlers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    brand_id: Mapped[int] = mapped_column(Integer, ForeignKey("brands.id", ondelete="SET NULL"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    gender: Mapped[str] = mapped_column(String(16), default="male")      # male, female, other
    alignment: Mapped[str] = mapped_column(String(16), default="face")    # face, heel, tweener
    status: Mapped[str] = mapped_column(String(32), default="active")    # active, injured, released, returning
    role: Mapped[str] = mapped_column(String(64), default="")            # Singles, Tag Team Specialist, Manager, etc.
    finisher: Mapped[str] = mapped_column(String(128), default="")
    power: Mapped[int] = mapped_column(Integer, default=50)              # 1-100 overall rating
    is_caw: Mapped[bool] = mapped_column(Boolean, default=False)          # Created wrestler
    wins: Mapped[int] = mapped_column(Integer, default=0)
    losses: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    game = relationship("Game", back_populates="wrestlers")
    brand = relationship("Brand", back_populates="wrestlers")

    def __repr__(self) -> str:
        return f"<Wrestler {self.id}: {self.name}>"
