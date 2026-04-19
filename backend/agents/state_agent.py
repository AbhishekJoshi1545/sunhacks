import uuid
from workflow.state import EventState, DecisionPayload, ActionPayload
from agents.extraction import extract_decision_full
from agents.action import execute_action
from db.chroma import store_source_document
from db.local_graph import graph_db


class StateAgentWorkflow:
    def __init__(self):
        # In-memory cache backed by local graph persistence.
        self.active_events = {}
        self._restore_from_db()

    def _restore_from_db(self):
        for item in graph_db.get_all_workflow_states():
            try:
                state = EventState(**item)
                self.active_events[state.id] = state
            except Exception:
                continue

    def process_new_event(self, event_state: EventState):
        """Ingestion Agent entry point."""
        event_state.status = "detected"
        event_state.lifecycle_state = "detected"
        event_state.source_ref = f"{event_state.source_type}:{event_state.id}"
        event_state.log("Ingestion Agent: source event detected.")
        self.active_events[event_state.id] = event_state
        self._save_state(event_state)
        return self._run_extraction_node(event_state)
        
    def _run_extraction_node(self, state: EventState):
        state.status = "parsed"
        state.lifecycle_state = "parsed"
        state.log("Extraction Agent: parsing event into decision schema.")
        
        extraction = extract_decision_full(state.raw_text)
        state.confidence = extraction.get("confidence", 0.0)
        state.found_decision = state.confidence > 0.5
        
        state.decision_text = extraction.get("decision") or "Decision pending clarification"
        state.rationale = extraction.get("reason") or "No rationale captured"
        state.stakeholders = extraction.get("people", []) or []
        state.urgency = extraction.get("urgency", "low")
        state.impact = extraction.get("impact", "low")

        # ALWAYS Store in Vector DB as organizational memory
        vector_id = store_source_document(
            event_id=state.id,
            source_type=state.source_type,
            text=state.raw_text,
            metadata={"source_ref": getattr(state, "source_ref", f"{state.source_type}:{state.id}"), "stakeholders": ",".join(state.stakeholders)}
        )
        state.metadata["vector_id"] = vector_id
        state.log("Memory/State Agent: source stored in vector memory.")

        if not state.found_decision:
            state.status = "archived"
            state.lifecycle_state = "archived"
            state.log("Extraction Agent: no reliable decision found; archived as source only.")
            if hasattr(graph_db, 'add_source_only'):
                graph_db.add_source_only(state)
            else:
                self._save_state(state)
            return state

        state.decision = DecisionPayload(
            decision_id=state.id,
            title=state.decision_text,
            rationale=state.rationale,
            alternatives=extraction.get("alternatives", []) or [],
            stakeholders=state.stakeholders,
            deadline=extraction.get("deadline"),
            risks=extraction.get("risks", []) or [],
            dependencies=extraction.get("dependencies", []) or [],
            required_actions=extraction.get("actions", []) or [],
            confidence=state.confidence,
            urgency=state.urgency,
            impact=state.impact,
            lifecycle_state="proposed"
        )
        state.action_required = len(state.decision.required_actions) > 0
        
        if state.impact.lower() in ["high", "medium"]:
            state.requires_human_approval = True
            actions = state.decision.required_actions or [{"type": "notify", "description": "Notify stakeholders of high impact decision."}]
            state.proposed_actions = [
                ActionPayload(
                    action_id=f"act_{uuid.uuid4()}",
                    decision_id=state.id,
                    action_type=a.get("type", "notify"),
                    payload={"description": a.get("description", "Action requested")},
                    execution_mode="approval",
                    status="pending"
                )
                for a in actions
            ]
            state.status = "pending_approval"
            state.lifecycle_state = "approval_pending"
            state.log(f"Reasoning Agent: impact {state.impact}; routed to human approval.")
        else:
            state.requires_human_approval = False
            actions = state.decision.required_actions or [{"type": "log", "description": "Auto-log routine decision."}]
            state.proposed_actions = [
                ActionPayload(
                    action_id=f"act_{uuid.uuid4()}",
                    decision_id=state.id,
                    action_type=a.get("type", "log"),
                    payload={"description": a.get("description", "Action requested")},
                    execution_mode="auto",
                    status="proposed"
                )
                for a in actions
            ]
            state.log("Reasoning Agent: low-risk decision; routed for auto execution.")
            return self._run_action_node(state)
            
        self._save_state(state)
        return state

    def handle_approval(self, event_id: str, is_approved: bool):
        if event_id not in self.active_events:
            return False
            
        state = self.active_events[event_id]
        if state.status != "pending_approval":
            return False

        if is_approved:
            state.log("Human approval received in Action Center.")
            return self._run_action_node(state)
        else:
            state.log("Human rejected action plan. Event archived.")
            state.status = "archived"
            state.lifecycle_state = "archived"
            self._save_state(state)
            return True

    def _run_action_node(self, state: EventState):
        state.status = "executing"
        state.lifecycle_state = "approved"
        state.log("Action Agent: executing approved action plan.")
        
        execution_results = []
        for action in state.proposed_actions:
            result = execute_action(action, state)
            execution_results.append(result)
            
        state.decision.lifecycle_state = "executed"
        graph_db.add_decision_full(state)
        graph_db.save_action_records(state.id, execution_results)
        state.log("Memory/State Agent: persisted decision graph and action results.")
        
        state.status = "executed"
        state.lifecycle_state = "executed"
        self._save_state(state)
        return state

    def _save_state(self, state: EventState):
        """Persist state and audit trace for workflow introspection APIs."""
        graph_db.save_event_state(state)

    def get_agent_status(self):
        pending = sum(1 for s in self.active_events.values() if s.status == "pending_approval")
        executed = sum(1 for s in self.active_events.values() if s.status == "executed")
        archived = sum(1 for s in self.active_events.values() if s.status == "archived")
        return {
            "ingestion_agent": "running",
            "retrieval_agent": "running",
            "reasoning_agent": "running",
            "action_agent": "running",
            "memory_state_agent": "running",
            "totals": {
                "active_events": len(self.active_events),
                "pending_approvals": pending,
                "executed": executed,
                "archived": archived
            }
        }

    def list_workflow_states(self):
        return [s.model_dump() for s in sorted(self.active_events.values(), key=lambda x: x.updated_at, reverse=True)]
        
workflow_manager = StateAgentWorkflow()
