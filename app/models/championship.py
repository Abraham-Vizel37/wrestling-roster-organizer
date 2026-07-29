from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Championship(Base):
    __tablename__ = "championships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    brand_id: Mapped[int] = mapped_column(Integer, ForeignKey("brands.id", ondelete="SET NULL"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    tier: Mapped[str] = mapped_column(String(32), default="world")      # world, midcard, tag, womens_world, womens_midcard, womens_tag
    holder1_id: Mapped[int] = mapped_column(Integer, ForeignKey("wrestlers.id", ondelete="SET NULL"), nullable=True)
    holder2_id: Mapped[int] = mapped_column(Integer, ForeignKey("wrestlers.id", ondelete="SET NULL"), nullable=True)
    is_vacant: Mapped[bool] = mapped_column(default=False)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    game = relationship("Game", back_populates="championships")
    brand = relationship("Brand", back_populates="championships")
    holder1 = relationship("Wrestler", foreign_keys=[holder1_id])
    holder2 = relationship("Wrestler", foreign_keys=[holder2_id])
    reigns = relationship("ChampionshipReign", back_populates="championship",
                          cascade="all, delete-orphan", order_by="ChampionshipReign.date_won.desc()")

    def __repr__(self) -> str:
        return f"<Championship {self.id}: {self.name}>"


class ChampionshipReign(Base):
    __tablename__ = "championship_reigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    championship_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("championships.id", ondelete="CASCADE"), nullable=False, index=True
    )
    holder1_id: Mapped[int] = mapped_column(Integer, ForeignKey("wrestlers.id", ondelete="SET NULL"), nullable=True)
    holder2_id: Mapped[int] = mapped_column(Integer, ForeignKey("wrestlers.id", ondelete="SET NULL"), nullable=True)
    date_won: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    date_lost: Mapped[datetime] = mapped_column(DateTime, nullable=True)  # None = current reign
    notes: Mapped[str] = mapped_column(Text, default="")

    # Relationships
    championship = relationship("Championship", back_populates="reigns")
    holder1 = relationship("Wrestler", foreign_keys=[holder1_id])
    holder2 = relationship("Wrestler", foreign_keys=[holder2_id])

    def __repr__(self) -> str:
        return f"<Reign {self.id}: champ={self.championship_id}>"
