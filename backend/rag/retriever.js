const { semanticSearch } = require('../db/vectorDb');
const { Decision } = require('../db/models');

async function retrieveContext(query, filters = {}, topK = 5) {
  const vectorResults = await semanticSearch(query, topK);
  
  const relatedDecisionIds = [...new Set(vectorResults
    .filter(r => r.metadata?.decision_id)
    .map(r => r.metadata.decision_id)
  )];

  const decisions = await Decision.find({ decision_id: { $in: relatedDecisionIds } }).lean();

  return { vectorResults, decisions };
}

module.exports = { retrieveContext };
