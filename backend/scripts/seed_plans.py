"""Crea los planes base (Emprendedor y Profesional) si no existen."""
import asyncio
import sys
import os
import uuid
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    plans = [
        ("Emprendedor", 99.0,  500,  "Plan para negocios pequeños"),
        ("Profesional", 199.0, 2000, "Plan para negocios en crecimiento"),
    ]

    async with engine.begin() as conn:
        for name, price, max_msg, description in plans:
            result = await conn.execute(
                text("SELECT id FROM plans WHERE name = CAST(:name AS plantype)"),
                {"name": name},
            )
            if result.scalar_one_or_none():
                print(f"[skip]  Plan ya existe: {name}")
                continue

            plan_id = str(uuid.uuid4())
            await conn.execute(
                text("""
                    INSERT INTO plans (id, name, price, max_messages_per_day, is_active, description, created_at, updated_at)
                    VALUES (:id, CAST(:name AS plantype), :price, :max_msg, true, :description, NOW(), NOW())
                """),
                {"id": plan_id, "name": name, "price": price, "max_msg": max_msg, "description": description},
            )
            print(f"[OK] Plan creado: {name} — S/ {price}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
