from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TagTeam(Base):
    __tablename__ = "tag_teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    brand_id: Mapped[int] = mapped_column(Integer, ForeignKey("brands.id", ondelete="SET NULL"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    member1_id: Mapped[int] = mapped_column(Integer, ForeignKey("wrestlers.id", ondelete="SET NULL"), nullable=True)
    member2_id: Mapped[int] = mapped_column(Integer, ForeignKey("wrestlers.id", ondelete="SET NULL"), nullable=True)
    alignment: Mapped[str] = mapped_column(String(16), default="face")   # face, heel, tweener
    status: Mapped[str] = mapped_column(String(32), default="active")    # active, inactive, disbanded
    wins: Mapped[int] = mapped_column(Integer, default=0)
    losses: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str] = mapped_column(Text, default="")

    # Relationships
    game = relationship("Game", back_populates="tag_teams")
    brand = relationship("Brand", back_populates="tag_teams")
    member1 = relationship("Wrestler", foreign_keys=[member1_id])
    member2 = relationship("Wrestler", foreign_keys=[member2_id])

    def __repr__(self) -> str:
        return f"<TagTeam {self.id}: {self.name}>"
