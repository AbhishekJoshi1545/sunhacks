const { Ollama } = require('@langchain/ollama');
const { Decision, Person, Tool } = require('../db/models');

const llm = new Ollama({
  model: process.env.OLLAMA_MODEL || 'llama3',
  baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434'
});

const EXTRACTION_PROMPT = `You are an expert at analyzing organizational communication to extract decisions.

Given the following text, determine if it contains an organizational decision.
If yes, extract the decision details. If no decision is present, return null.

Respond ONLY with valid JSON. No explanation, no markdown.

If decision found:
{
  "found": true,
  "decision": "<short statement of what was decided>",
  "reason": "<why this was decided>",
  "alternatives": ["<other options considered>"],
  "people": ["<email or name of person who made/participated in decision>"],
  "date": "<ISO date if mentioned, else null>",
  "tags": ["<relevant keywords like: database, infrastructure, frontend, etc>"],
  "confidence": <0.0 to 1.0>
}

If no decision:
{ "found": false }

TEXT TO ANALYZE:
{text}`;

async function extractDecision(text, metadata = {}) {
  try {
    const prompt = EXTRACTION_PROMPT.replace('{text}', text.slice(0, 2000));
    const response = await llm.invoke(prompt);

    const clean = response.trim().replace(/```json|```/g, '');
    const parsed = JSON.parse(clean);

    if (!parsed.found || parsed.confidence < 0.7) return null;

    // Create DB Document
    const decisionDoc = new Decision({
      decision_id: require('uuid').v4(),
      decision: parsed.decision,
      reason: parsed.reason,
      alternatives: parsed.alternatives || [],
      people: parsed.people || [],
      date: parsed.date || metadata.date || new Date().toISOString().split('T')[0],
      source: metadata,
      tags: parsed.tags || [],
      confidence: parsed.confidence,
    });

    await decisionDoc.save();

    // Map Entities
    for (const p of parsed.people || []) {
       await Person.updateOne(
         { email: p.toLowerCase() },
         { $setOnInsert: { name: p.split('@')[0] }, $addToSet: { decisions_made: decisionDoc.decision_id } },
         { upsert: true }
       );
    }
    for (const t of parsed.tags || []) {
       await Tool.updateOne({ name: t.toLowerCase() }, {}, { upsert: true });
    }

    return decisionDoc;
  } catch (err) {
    console.error('Extraction failed:', err.message);
    return null;
  }
}

module.exports = { extractDecision };
