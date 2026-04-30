import logging
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.api.deps import DB, CurrentUser

logger = logging.getLogger(__name__)
from app.models.agent import VendedorAgent, TrainingBlock
from app.models.user import UserRole
from app.schemas.agent import (
    AgentCreate, AgentUpdate, AgentOut,
    TrainingBlockCreate, TrainingBlockOut,
    SimulatorRequest, SimulatorResponse,
)
from app.schemas.common import Response
from app.services.simulator import SimulatorService

router = APIRouter(prefix="/agents", tags=["agents"])


def _check_tenant_access(current_user, tenant_id: str):
    if current_user.role != UserRole.admin and current_user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Sin acceso a este tenant")


async def _get_agent_or_404(db: DB, agent_id: str, tenant_id: str) -> VendedorAgent:
    result = await db.execute(
        select(VendedorAgent)
        .where(VendedorAgent.id == agent_id, VendedorAgent.tenant_id == tenant_id)
        .options(selectinload(VendedorAgent.training_blocks))
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    return agent


# ── Agentes ────────────────────────────────────────────────

@router.get("/{tenant_id}", response_model=Response)
async def list_agents(tenant_id: str, db: DB, current_user: CurrentUser):
    _check_tenant_access(current_user, tenant_id)
    result = await db.execute(
        select(VendedorAgent)
        .where(VendedorAgent.tenant_id == tenant_id)
        .options(selectinload(VendedorAgent.training_blocks))
        .order_by(VendedorAgent.created_at.desc())
    )
    agents = result.scalars().all()
    return Response(data=[AgentOut.model_validate(a).model_dump() for a in agents])


@router.post("/{tenant_id}", response_model=Response, status_code=status.HTTP_201_CREATED)
async def create_agent(tenant_id: str, body: AgentCreate, db: DB, current_user: CurrentUser):
    _check_tenant_access(current_user, tenant_id)
    agent = VendedorAgent(tenant_id=tenant_id, **body.model_dump())
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return Response(data=AgentOut.model_validate(agent).model_dump(), message="Agente creado", status=201)


@router.get("/{tenant_id}/{agent_id}", response_model=Response)
async def get_agent(tenant_id: str, agent_id: str, db: DB, current_user: CurrentUser):
    _check_tenant_access(current_user, tenant_id)
    agent = await _get_agent_or_404(db, agent_id, tenant_id)
    return Response(data=AgentOut.model_validate(agent).model_dump())


@router.put("/{tenant_id}/{agent_id}", response_model=Response)
async def update_agent(tenant_id: str, agent_id: str, body: AgentUpdate, db: DB, current_user: CurrentUser):
    _check_tenant_access(current_user, tenant_id)
    agent = await _get_agent_or_404(db, agent_id, tenant_id)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(agent, field, value)
    await db.commit()
    await db.refresh(agent)
    return Response(data=AgentOut.model_validate(agent).model_dump(), message="Agente actualizado")


@router.delete("/{tenant_id}/{agent_id}", response_model=Response)
async def delete_agent(tenant_id: str, agent_id: str, db: DB, current_user: CurrentUser):
    _check_tenant_access(current_user, tenant_id)
    agent = await _get_agent_or_404(db, agent_id, tenant_id)
    await db.delete(agent)
    await db.commit()
    return Response(message="Agente eliminado")


# ── Bloques de entrenamiento ────────────────────────────────

@router.get("/{tenant_id}/{agent_id}/training", response_model=Response)
async def list_training(tenant_id: str, agent_id: str, db: DB, current_user: CurrentUser):
    _check_tenant_access(current_user, tenant_id)
    agent = await _get_agent_or_404(db, agent_id, tenant_id)
    blocks = [TrainingBlockOut.model_validate(b).model_dump() for b in agent.training_blocks]
    return Response(data=blocks)


@router.post("/{tenant_id}/{agent_id}/training", response_model=Response, status_code=status.HTTP_201_CREATED)
async def add_training_block(
    tenant_id: str, agent_id: str, body: TrainingBlockCreate, db: DB, current_user: CurrentUser
):
    _check_tenant_access(current_user, tenant_id)
    logger.info("[TRAINING] tenant=%s agent=%s user=%s content_len=%d", tenant_id, agent_id, current_user.email, len(body.content))
    await _get_agent_or_404(db, agent_id, tenant_id)
    block = TrainingBlock(agent_id=agent_id, content=body.content)
    db.add(block)
    await db.commit()
    await db.refresh(block)
    logger.info("[TRAINING] INSERT OK block_id=%s", block.id)
    return Response(data=TrainingBlockOut.model_validate(block).model_dump(), message="Bloque de entrenamiento guardado", status=201)


@router.delete("/{tenant_id}/{agent_id}/training/{block_id}", response_model=Response)
async def delete_training_block(
    tenant_id: str, agent_id: str, block_id: str, db: DB, current_user: CurrentUser
):
    _check_tenant_access(current_user, tenant_id)
    result = await db.execute(
        select(TrainingBlock).where(TrainingBlock.id == block_id, TrainingBlock.agent_id == agent_id)
    )
    block = result.scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="Bloque no encontrado")
    await db.delete(block)
    await db.commit()
    return Response(message="Bloque eliminado")


# ── Simulador ────────────────────────────────────────────────

@router.post("/{tenant_id}/{agent_id}/simulate", response_model=Response)
async def simulate(
    tenant_id: str, agent_id: str, body: SimulatorRequest, db: DB, current_user: CurrentUser
):
    _check_tenant_access(current_user, tenant_id)
    agent = await _get_agent_or_404(db, agent_id, tenant_id)

    training_contents = [b.content for b in agent.training_blocks]
    service = SimulatorService()
    reply = await service.chat(
        training_blocks=training_contents,
        user_message=body.message,
        history=body.history,
    )
    return Response(data=SimulatorResponse(reply=reply).model_dump())
