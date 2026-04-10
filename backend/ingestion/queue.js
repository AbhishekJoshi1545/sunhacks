const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const { chunkText } = require('./chunker');
const { extractDecision } = require('../agents/extractionAgent');
const { storeChunks } = require('../db/vectorDb');

async function processItems(items, source_type) {
  console.log(`Processing ${items.length} items from ${source_type}`);

  for (const item of items) {
    const chunks = chunkText(item.text);
    const metadata = {
      type: source_type,
      source_id: item.source_id,
      date: item.timestamp?.split('T')[0],
      people: item.user ? [item.user] : [],
      url: item.url || null
    };

    const decision = await extractDecision(item.text, metadata);
    
    const embeddingIds = await storeChunks(chunks, {
        ...metadata, 
        decision_id: decision ? decision.decision_id : null 
    });

    if (decision) {
       decision.embedding_id = embeddingIds[0];
       await decision.save();
       console.log(`Decision extracted: "${decision.decision.substring(0, 40)}..."`);
    }
  }
}

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const useRedisQueue = process.env.USE_REDIS_QUEUE === 'true';
let connection = null;
let ingestionQueue = null;
let worker = null;

if (useRedisQueue) {
  connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 2000))
  });

  connection.on('error', (err) => {
    console.warn(`Redis unavailable (${redisUrl}): ${err.message}. Falling back to inline ingestion.`);
  });

  ingestionQueue = new Queue('ingestion', { connection });

  worker = new Worker('ingestion', async (job) => {
    const { items, source_type } = job.data;
    await processItems(items, source_type);
  }, { connection, concurrency: 3 });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err.message);
  });
} else {
  console.log('USE_REDIS_QUEUE is not enabled. Using inline ingestion mode.');
}

async function enqueueIngestion(items, source_type) {
  if (ingestionQueue) {
    await ingestionQueue.add(`ingest-${source_type}`, { items, source_type }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    });
    return;
  }

  await processItems(items, source_type);
}

module.exports = { enqueueIngestion };
