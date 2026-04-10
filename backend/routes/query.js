const express = require('express');
const { runQuery } = require('../rag/pipeline');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { query, filters } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await runQuery(query.trim(), filters || {});
    res.json(result);
  } catch (err) {
    console.error('Query error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
