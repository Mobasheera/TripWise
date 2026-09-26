from typing import Any, List
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str
    content: str


class AIRequest(BaseModel):
    question: str
    history: List[ChatMessage] = Field(default_factory=list)
    context: dict[str, Any] = Field(default_factory=dict)