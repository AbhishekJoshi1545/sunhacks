from datetime import datetime
from workflow.state import EventState, ActionPayload


def execute_action(action: ActionPayload, state: EventState):
    """Executes parsed action hooks in a safe MVP mode and returns execution metadata."""
    action_type = action.action_type or "log"
    description = action.payload.get("description", "")

    if action_type == "create_task":
        state.log(f"Action Agent: created task (simulated) - {description}")
    elif action_type == "notify":
        state.log(f"Action Agent: sent notification (simulated) - {description}")
    elif action_type == "escalate":
        state.log(f"Action Agent: escalation triggered (simulated) - {description}")
    else:
        state.log(f"Action Agent: action logged - {description}")

    action.status = "executed"
    action.executed_at = datetime.utcnow().isoformat()
    return {
        "action_id": action.action_id,
        "action_type": action_type,
        "status": action.status,
        "executed_at": action.executed_at
    }
