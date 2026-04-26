from typing import Any
from pydantic import BaseModel


class Response(BaseModel):
    data: Any = None
    message: str = "OK"
    status: int = 200
