const { Ollama } = require('@langchain/ollama');
const { retrieveContext } = require('./retriever');

const llm = new Ollama({
  model: process.env.OLLAMA_MODEL || 'llama3',
  baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434'
});

const SYSTEM_PROMPT = `You are an Organizational Memory Assistant. 
Your job is to answer questions about organizational decisions based ONLY on the provided context.

Rules:
1. Only use information from the provided context to answer
2. If the context doesn't contain relevant information, say: "I don't have enough information to answer this."
3. Always be specific and cite which source your answer comes from
4. Be concise and clear

Context:
{context}`;

function assembleContext(vectorResults, decisions) {
  const parts = [];

  if (vectorResults.length > 0) {
    parts.push('=== RELEVANT DOCUMENTS ===');
    vectorResults.forEach((r, i) => {
      parts.push(`[${i + 1}] Source: ${r.metadata.type || r.metadata.source_type} | Date: ${r.metadata.date}`);
      parts.push(r.text.slice(0, 500));
      parts.push('');
    });
  }

  if (decisions && decisions.length > 0) {
    parts.push('=== RELATED DECISIONS ===');
    decisions.forEach((d, i) => {
      parts.push(`[D${i + 1}] Decision: ${d.decision}`);
      parts.push(`     Reason: ${d.reason}`);
      if (d.people && d.people.length > 0) parts.push(`     People: ${d.people.join(', ')}`);
      parts.push('');
    });
  }

  return parts.join('\n');
}

async function runQuery(userQuery, filters = {}) {
  const startTime = Date.now();

  const { vectorResults, decisions } = await retrieveContext(userQuery, filters, filters.top_k || 5);

  if (vectorResults.length === 0 && decisions.length === 0) {
    return {
      answer: "I don't have any relevant information about this topic in the knowledge base.",
      sources: [],
      reasoning_steps: ['No relevant documents found in vector DB', 'No matching decisions in DB'],
      confidence: 0,
      query_time_ms: Date.now() - startTime
    };
  }

  const context = assembleContext(vectorResults, decisions);

  const prompt = SYSTEM_PROMPT.replace('{context}', context) +
    `\n\nQuestion: ${userQuery}\n\nAnswer:`;

  const answer = await llm.invoke(prompt);

  const sources = [
    ...vectorResults.map(r => ({
      type: r.metadata.type || r.metadata.source_type,
      source_id: r.metadata.source_id,
      date: r.metadata.date,
      url: r.metadata.url || null,
      snippet: r.text.slice(0, 200)
    })),
    ...decisions.map(d => ({
      type: 'knowledge_graph',
      decision: d.decision,
      date: d.date,
      people: d.people
    }))
  ];

  const reasoning_steps = [
    `Searched vector database, found ${vectorResults.length} relevant chunks`,
    `Database lookup, found ${decisions.length} related decisions`,
    `Assembled ${context.length} characters of context`,
    `Generated answer using ${process.env.OLLAMA_MODEL || 'llama3'}`
  ];

  return {
    answer: answer.trim(),
    sources,
    reasoning_steps,
    confidence: vectorResults.length > 0 ? vectorResults[0].score : 0.5,
    query_time_ms: Date.now() - startTime
  };
}

module.exports = { runQuery };
