const { OllamaEmbeddings } = require('@langchain/ollama');
const { Chunk } = require('./models');

const embeddings = new OllamaEmbeddings({
  model: 'nomic-embed-text',
  baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434'
});

async function storeChunks(chunksArray, metadata) {
  const ids = [];

  for (let i = 0; i < chunksArray.length; i++) {
    const chunkData = chunksArray[i];
    const embedding = await embeddings.embedQuery(chunkData.text);
    
    // Save to MongoDB Vector Store
    const chunkDoc = new Chunk({
      text: chunkData.text,
      embedding: embedding,
      metadata: {
        ...metadata,
        chunk_index: i,
        total_chunks: chunksArray.length
      }
    });

    await chunkDoc.save();
    ids.push(chunkDoc._id);
  }

  return ids;
}

async function semanticSearch(query, topK = 5) {
  const queryEmbedding = await embeddings.embedQuery(query);

  try {
    const results = await Chunk.aggregate([
      {
        "$vectorSearch": {
          "index": "vector_index",
          "path": "embedding",
          "queryVector": queryEmbedding,
          "numCandidates": 100,
          "limit": topK
        }
      },
      {
        "$project": {
          "text": 1,
          "metadata": 1,
          "score": { "$meta": "searchScore" }
        }
      }
    ]);

    return results.map(doc => ({
      text: doc.text,
      metadata: doc.metadata,
      score: doc.score || 1.0
    }));
  } catch (err) {
    // Note: Local MongoDB instances without Atlas Vector Search will throw an error.
    console.warn('Vector search execution warning (verify Atlas setup):', err.message);
    return [];
  }
}

module.exports = { storeChunks, semanticSearch };
