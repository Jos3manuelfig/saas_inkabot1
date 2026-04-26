from fastapi import APIRouter
from app.api.v1 import auth, tenants, stats, payments, whatsapp

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(tenants.router)
router.include_router(stats.router)
router.include_router(payments.router)
router.include_router(whatsapp.router)
