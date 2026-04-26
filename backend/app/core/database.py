from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings


class Base(DeclarativeBase):
    pass


# Motor principal — base de datos de INKABOT
engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# Motor secundario — base de datos de n8n (solo lectura)
n8n_engine = create_async_engine(
    settings.N8N_DATABASE_URL, echo=False, pool_pre_ping=True
)
N8nSessionLocal = async_sessionmaker(n8n_engine, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


async def get_n8n_db() -> AsyncSession:
    async with N8nSessionLocal() as session:
        yield session
