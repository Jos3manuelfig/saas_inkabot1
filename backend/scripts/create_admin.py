"""
Script para crear el usuario admin y un cliente de prueba en la base de datos.
Ejecutar: python scripts/create_admin.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.tenant import Tenant
from app.core.database import Base


async def create_users():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with SessionLocal() as db:
        # Crear tenant de prueba para el cliente
        tenant = Tenant(
            name="Costuras Yuly",
            email="yuly@costurasYuly.pe",
            phone="+51987654321",
        )
        db.add(tenant)
        await db.flush()

        # Admin (José Manuel)
        admin = User(
            email="admin@inkabot.pe",
            hashed_password=hash_password("admin123"),
            full_name="José Manuel",
            role=UserRole.admin,
            tenant_id=None,
        )
        db.add(admin)

        # Cliente de prueba
        client_user = User(
            email="yuly@costurasYuly.pe",
            hashed_password=hash_password("cliente123"),
            full_name="Yuly Ramírez",
            role=UserRole.client,
            tenant_id=tenant.id,
        )
        db.add(client_user)

        await db.commit()
        print("✅ Usuarios creados:")
        print(f"   Admin:   admin@inkabot.pe     / admin123")
        print(f"   Cliente: yuly@costurasYuly.pe / cliente123")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_users())
