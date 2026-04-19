from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class DecisionPayload(BaseModel):
    decision_id: Optional[str] = None
    title: Optional[str] = None
    rationale: Optional[str] = None
    alternatives: List[str] = Field(default_factory=list)
    stakeholders: List[str] = Field(default_factory=list)
    deadline: Optional[str] = None
    risks: List[str] = Field(default_factory=list)
    dependencies: List[str] = Field(default_factory=list)
    required_actions: List[Dict[str, Any]] = Field(default_factory=list)
    confidence: float = 0.0
    urgency: str = "low"
    impact: str = "low"
    lifecycle_state: str = "draft"


class ActionPayload(BaseModel):
    action_id: str
    decision_id: Optional[str] = None
    action_type: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    execution_mode: str = "auto"
    status: str = "proposed"
    executed_at: Optional[str] = None
    rollback_info: Optional[str] = None

class EventState(BaseModel):
    """Represents a single organizational event progressing through the autonomous pipeline."""
    id: str
    source_type: str
    raw_text: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

    source_ref: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    found_decision: bool = False
    decision_text: Optional[str] = None
    rationale: Optional[str] = None
    stakeholders: List[str] = Field(default_factory=list)
    urgency: str = "low"
    impact: str = "low"
    confidence: float = 0.0

    decision: DecisionPayload = Field(default_factory=DecisionPayload)

    action_required: bool = False
    proposed_actions: List[ActionPayload] = Field(default_factory=list)
    requires_human_approval: bool = False

    status: str = "detected"
    lifecycle_state: str = "detected"
    audit_log: List[str] = Field(default_factory=list)

    def log(self, message: str):
        self.updated_at = datetime.utcnow().isoformat()
        self.audit_log.append(message)
