from fastapi import APIRouter, Depends
from core.deps import get_current_user
from models.schema import User
from models.schemas import ExplainTextRequest, ExplainTextResponse
from services.llm_service import explain_text

router = APIRouter(
    tags=["ai"]
)

@router.post("/explain-text", response_model=ExplainTextResponse)
@router.post("/explain-text/", response_model=ExplainTextResponse)
@router.post("/explain", response_model=ExplainTextResponse)
@router.post("/explain/", response_model=ExplainTextResponse)
async def explain_selected_text(
    payload: ExplainTextRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Context-aware AI explanation endpoint (Jargon Buster).
    Accepts `selected_text`, applies word-count logic, and queries Groq.
    """
    explanation = explain_text(payload.selected_text)
    return ExplainTextResponse(explanation=explanation)

