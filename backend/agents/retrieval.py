from db.chroma import get_collection
from db.local_graph import graph_db
from .extraction import get_embedding

def retrieve_context(query: str, top_k: int = 5) -> dict:
    """Retrieves relevant text from Chroma and relationships from NetworkX."""
    # 1. Embed query
    query_embedding = get_embedding(query)
    
    vector_results = []
    graph_context = []
    
    if query_embedding:
        collection = get_collection()
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )
        # Parse Chroma results
        if results and "documents" in results and "metadatas" in results:
            for i, doc in enumerate(results["documents"][0]):
                meta = results["metadatas"][0][i]
                vector_results.append({
                    "text": doc,
                    "metadata": meta
                })
    
    # 2. Simple heuristic Graph Retrieval
    # If any query terms match decision text in graph
    query_terms = [t for t in query.lower().split() if len(t) > 3]
    matched_nodes = []
    
    all_decisions = graph_db.get_all_decisions()
    for d in all_decisions:
        node_str = f"{d.get('text', '')} {d.get('reason', '')}".lower()
        if any(term in node_str for term in query_terms):
            matched_nodes.append(d.get("id"))
            
    for node_id in matched_nodes[:5]: # limit to 5 nodes
        if node_id:
            context = graph_db.get_decision_context(node_id)
            if context:
                graph_context.append(context)
            
    return {
        "vector_results": vector_results,
        "graph_context": graph_context
    }
