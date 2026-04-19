import chromadb
from chromadb.config import Settings
import os
from typing import Dict, Any, List

# Create persistent Chroma DB client
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "chroma_data")
os.makedirs(DB_PATH, exist_ok=True)

client = chromadb.PersistentClient(path=DB_PATH)

def get_collection():
    return client.get_or_create_collection(
        name="organizational_memory",
        metadata={"hnsw:space": "cosine"}
    )


def store_source_document(event_id: str, source_type: str, text: str, metadata: Dict[str, Any] = None) -> str:
    collection = get_collection()
    doc_id = f"{source_type}_{event_id}"
    payload = metadata or {}
    payload.update({"source_type": source_type, "source_id": event_id})
    collection.upsert(
        ids=[doc_id],
        documents=[text],
        metadatas=[payload]
    )
    return doc_id


def inspect_recent_sources(limit: int = 10) -> List[Dict[str, Any]]:
    collection = get_collection()
    batch = collection.get(limit=limit, include=["metadatas", "documents"])
    ids = batch.get("ids", [])
    metadatas = batch.get("metadatas", [])
    documents = batch.get("documents", [])
    out = []
    for i, source_id in enumerate(ids):
        meta = metadatas[i] if i < len(metadatas) else {}
        doc = documents[i] if i < len(documents) else ""
        out.append({
            "id": source_id,
            "source_type": meta.get("source_type", "unknown"),
            "metadata": meta,
            "snippet": (doc or "")[:240]
        })
    return out
