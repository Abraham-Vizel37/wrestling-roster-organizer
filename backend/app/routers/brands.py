from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.brand import Brand
from app.schemas import (
    BrandCreate, BrandResponse, BrandUpdate,
)
from app.services.export_import import count_rows
from app.models.wrestler import Wrestler
from app.models.championship import Championship

router = APIRouter(prefix="/api/brands", tags=["Brands"])


@router.get("", response_model=list[BrandResponse])
async def list_brands(
    game_id: int = None,
    db: AsyncSession = Depends(get_db),
):
    """List brands, optionally filtered by game_id."""
    stmt = select(Brand).order_by(Brand.sort_order, Brand.name)
    if game_id:
        stmt = stmt.where(Brand.game_id == game_id)
    result = await db.execute(stmt)
    brands = []
    for b in result.scalars().all():
        wc = await count_rows(db, Wrestler, [Wrestler.brand_id == b.id])
        cc = await count_rows(db, Championship, [Championship.brand_id == b.id])
        b.wrestler_count = wc
        b.championship_count = cc
        brands.append(b)
    return brands


@router.post("", response_model=BrandResponse, status_code=201)
async def create_brand(data: BrandCreate, db: AsyncSession = Depends(get_db)):
    brand = Brand(**data.model_dump())
    db.add(brand)
    await db.commit()
    await db.refresh(brand)
    return brand


@router.get("/{brand_id}", response_model=BrandResponse)
async def get_brand(brand_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Brand).where(Brand.id == brand_id))
    brand = result.scalar_one_or_none()
    if not brand:
        raise HTTPException(404, "Brand not found")
    brand.wrestler_count = await count_rows(db, Wrestler, [Wrestler.brand_id == brand.id])
    brand.championship_count = await count_rows(db, Championship, [Championship.brand_id == brand.id])
    return brand


@router.patch("/{brand_id}", response_model=BrandResponse)
async def update_brand(brand_id: int, data: BrandUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Brand).where(Brand.id == brand_id))
    brand = result.scalar_one_or_none()
    if not brand:
        raise HTTPException(404, "Brand not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(brand, key, val)
    await db.commit()
    await db.refresh(brand)
    return brand


@router.delete("/{brand_id}", status_code=204)
async def delete_brand(brand_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Brand).where(Brand.id == brand_id))
    brand = result.scalar_one_or_none()
    if not brand:
        raise HTTPException(404, "Brand not found")
    await db.delete(brand)
    await db.commit()
