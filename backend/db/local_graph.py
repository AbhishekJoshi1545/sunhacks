import os
import json
from neo4j import GraphDatabase

GRAPH_FILE = os.path.join(os.path.dirname(__file__), "..", "graph_data.json")
AUDIT_FILE = os.path.join(os.path.dirname(__file__), "..", "audit_data.json")
ACTION_FILE = os.path.join(os.path.dirname(__file__), "..", "action_data.json")

class LocalGraphDB:
    def __init__(self):
        self.audit_records = []
        self.action_records = []
        self.driver = None
        self.neo4j_enabled = False
        
        # Connect to Neo4j
        uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = os.getenv("NEO4J_USER", "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "password")
        
        try:
            self.driver = GraphDatabase.driver(uri, auth=(user, password))
            self.driver.verify_connectivity()
            self.neo4j_enabled = True
            print("[Graph DB] Connected to Neo4j successfully.")
        except Exception as e:
            print(f"[Graph DB] Neo4j connection info: using JSON fallback for decisions due to connection failure. (Check NEO4J_URI/USER/PASSWORD). Error: {type(e).__name__}")
            
        self.load()

    def close(self):
        if self.driver:
            self.driver.close()

    def add_decision_full(self, state):
        if self.neo4j_enabled:
            with self.driver.session() as session:
                session.execute_write(self._create_decision_nodes, state)
        self.save_event_state(state)

    @staticmethod
    def _create_decision_nodes(tx, state):
        tx.run(
            """
            MERGE (d:Decision {id: $id})
            SET d.text = $text,
                d.reason = $reason,
                d.urgency = $urgency,
                d.impact = $impact,
                d.status = $status,
                d.confidence = $confidence,
                d.lifecycle_state = $lifecycle_state
            """,
            id=state.id, text=state.decision_text, reason=state.rationale,
            urgency=state.urgency, impact=state.impact, status=state.status,
            confidence=state.confidence, lifecycle_state=state.lifecycle_state
        )
        
        for person in state.stakeholders:
            person_id = person.lower()
            tx.run(
                """
                MERGE (p:Person {id: $person_id})
                SET p.name = $person_name
                WITH p
                MATCH (d:Decision {id: $decision_id})
                MERGE (p)-[:MADE]->(d)
                """,
                person_id=person_id, person_name=person, decision_id=state.id
            )
            
        source_id = f"{state.source_type}_{state.id}"
        tx.run(
            """
            MERGE (s:Source {id: $source_id})
            SET s.raw_text = $raw_text
            WITH s
            MATCH (d:Decision {id: $decision_id})
            MERGE (d)-[:SOURCED_FROM]->(s)
            """,
            source_id=source_id, raw_text=state.raw_text, decision_id=state.id
        )

    def add_source_only(self, state):
        if self.neo4j_enabled:
            with self.driver.session() as session:
                session.execute_write(self._create_source_node, state)
        self.save_event_state(state)

    @staticmethod
    def _create_source_node(tx, state):
        source_id = f"{state.source_type}_{state.id}"
        tx.run(
            """
            MERGE (s:Source {id: $source_id})
            SET s.raw_text = $raw_text,
                s.source_type = $source_type
            """,
            source_id=source_id, raw_text=state.raw_text, source_type=state.source_type
        )

    def get_decision_context(self, decision_id: str):
        if not self.neo4j_enabled:
            return None
        with self.driver.session() as session:
            return session.execute_read(self._get_decision_details, decision_id)

    @staticmethod
    def _get_decision_details(tx, decision_id):
        record = tx.run("MATCH (d:Decision {id: $id}) RETURN d", id=decision_id).single()
        if not record:
            return None
        node = dict(record["d"])
        
        people = []
        for r in tx.run("MATCH (p:Person)-[rel:MADE]->(d:Decision {id: $id}) RETURN p.id as p_id, p.name as name", id=decision_id):
            people.append((r["p_id"], decision_id, {"relation": "MADE"}))
            
        sources = []
        for r in tx.run("MATCH (d:Decision {id: $id})-[rel:SOURCED_FROM]->(s:Source) RETURN s.id as s_id", id=decision_id):
            sources.append((decision_id, r["s_id"], {"relation": "SOURCED_FROM"}))
            
        return {"node": node, "people": people, "sources": sources}

    def get_all_decisions(self):
        if not self.neo4j_enabled:
            return []
        decisions = []
        with self.driver.session() as session:
            result = session.run("MATCH (d:Decision) RETURN d")
            for record in result:
                data = dict(record["d"])
                decisions.append({
                    "id": data.get("id"),
                    "text": data.get("text"),
                    "reason": data.get("reason"),
                    "date": "Extracted Auto",
                    "status": data.get("status"),
                    "lifecycle_state": data.get("lifecycle_state"),
                    "confidence": data.get("confidence", 0),
                    "impact": data.get("impact", "low"),
                    "urgency": data.get("urgency", "low")
                })
        return decisions

    def save_event_state(self, state):
        existing = next((i for i, x in enumerate(self.audit_records) if x['id'] == state.id), None)
        if existing is not None:
            self.audit_records[existing] = state.model_dump()
        else:
            self.audit_records.append(state.model_dump())
        self.save()

    def save_action_records(self, workflow_id: str, actions):
        for action in actions:
            action["workflow_id"] = workflow_id
            self.action_records.append(action)
        self.save()

    def get_action_records(self, workflow_id: str = None):
        if workflow_id:
            return [a for a in self.action_records if a.get("workflow_id") == workflow_id]
        return list(reversed(self.action_records))

    def get_all_workflow_states(self):
        return self.audit_records
        
    def get_all_audit_logs(self):
        return list(reversed(self.audit_records))

    def save(self):
        with open(AUDIT_FILE, 'w') as f:
            json.dump(self.audit_records, f)
        with open(ACTION_FILE, 'w') as f:
            json.dump(self.action_records, f)

    def load(self):
        if os.path.exists(AUDIT_FILE):
            try:
                with open(AUDIT_FILE, 'r') as f:
                    self.audit_records = json.load(f)
            except Exception:
                pass
        if os.path.exists(ACTION_FILE):
            try:
                with open(ACTION_FILE, 'r') as f:
                    self.action_records = json.load(f)
            except Exception:
                pass

graph_db = LocalGraphDB()
