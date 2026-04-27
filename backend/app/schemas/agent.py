from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AgentCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"name": "Vendedor Ropa", "description": "Agente para tienda de ropa"}})
    name: str
    description: str | None = None


class AgentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class TrainingBlockOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    content: str
    created_at: datetime


class AgentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    tenant_id: str
    name: str
    description: str | None
    is_active: bool
    created_at: datetime
    training_blocks: list[TrainingBlockOut] = []


class TrainingBlockCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"content": "Vendo ropa de mujer. Mis precios van desde S/30 hasta S/150."}})
    content: str


class SimulatorMessage(BaseModel):
    role: str  # "user" o "assistant"
    content: str


class SimulatorRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"message": "Hola, ¿qué productos tienen?", "history": []}})
    message: str
    history: list[SimulatorMessage] = []


class SimulatorResponse(BaseModel):
    reply: str
