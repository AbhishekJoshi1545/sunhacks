const express = require('express');
const multer = require('multer');
const { enqueueIngestion } = require('../ingestion/queue');
const { ingestFromMcpSource } = require('../ingestion/mcpIngestion');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const text = req.file.buffer.toString('utf-8');
    
    await enqueueIngestion([{
      source_id: 'manual-' + Date.now(),
      text: text,
      timestamp: new Date().toISOString(),
      url: null
    }], 'manual_upload');

    res.json({
      status: 'queued',
      message: 'Document queued for processing'
    });
  } catch (err) {
    console.error('Ingest error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/slack', async (req, res) => {
  try {
    const result = await ingestFromMcpSource('slack', req.body || {});
    res.json(result);
  } catch (err) {
    console.error('Slack ingest error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/gmail', async (req, res) => {
  try {
    const result = await ingestFromMcpSource('gmail', req.body || {});
    res.json(result);
  } catch (err) {
    console.error('Gmail ingest error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/gdrive', async (req, res) => {
  try {
    const result = await ingestFromMcpSource('gdrive', req.body || {});
    res.json(result);
  } catch (err) {
    console.error('GDrive ingest error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
