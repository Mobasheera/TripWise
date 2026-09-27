# from typing import Any, List
# from pydantic import BaseModel, Field


# class ChatMessage(BaseModel):
#     role: str
#     content: str


# class AIRequest(BaseModel):
#     question: str
#     history: List[ChatMessage] = Field(default_factory=list)
#     context: dict[str, Any] = Field(default_factory=dict)


from typing import Any, List, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str
    content: str


class AIRequest(BaseModel):
    question: str
    history: List[ChatMessage] = Field(default_factory=list)
    context: dict[str, Any] = Field(default_factory=dict)
    receipt: Optional[dict[str, Any]] = None


class ReceiptRequest(BaseModel):
    image_data_url: str
    trip_id: str
