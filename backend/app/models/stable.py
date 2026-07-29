from sqlalchemy import Column, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# Many-to-many: Stable <-> Wrestler
stable_members = Table(
    "stable_members",
    Base.metadata,
    Column("stable_id", Integer, ForeignKey("stables.id", ondelete="CASCADE"), primary_key=True),
    Column("wrestler_id", Integer, ForeignKey("wrestlers.id", ondelete="SET NULL"), primary_key=True),
)


class Stable(Base):
    __tablename__ = "stables"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    brand_id: Mapped[int] = mapped_column(Integer, ForeignKey("brands.id", ondelete="SET NULL"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active")    # active, inactive, disbanded
    notes: Mapped[str] = mapped_column(Text, default="")

    # Relationships
    game = relationship("Game", back_populates="stables")
    brand = relationship("Brand", back_populates="stables")
    members = relationship("Wrestler", secondary=stable_members, lazy="selectin")

    def __repr__(self) -> str:
        return f"<Stable {self.id}: {self.name}>"
