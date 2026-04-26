from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from app.api.deps import DB, CurrentUser
from app.core.security import verify_password, create_access_token
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserOut
from app.schemas.common import Response

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Response)
async def login(body: LoginRequest, db: DB):
    result = await db.execute(
        select(User).where(User.email == body.email, User.is_active == True)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    token = create_access_token(subject=user.id, extra={"role": user.role, "tenant_id": user.tenant_id})
    return Response(
        data=TokenResponse(access_token=token).model_dump(),
        message="Login exitoso",
    )


@router.get("/me", response_model=Response)
async def me(current_user: CurrentUser):
    return Response(data=UserOut.model_validate(current_user).model_dump())
