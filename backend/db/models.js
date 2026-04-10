const mongoose = require('mongoose');

const SourceSchema = new mongoose.Schema({
  type: { type: String, enum: ['slack', 'gmail', 'google_drive', 'manual_upload', 'unknown'], required: true },
  source_id: { type: String },
  url: { type: String },
  title: { type: String }
}, { _id: false });

const DecisionSchema = new mongoose.Schema({
  decision_id: { type: String, required: true, unique: true },
  decision: { type: String, required: true },
  reason: { type: String },
  alternatives: [String],
  people: [String],
  date: { type: String },
  source: SourceSchema,
  tags: [String],
  confidence: { type: Number, min: 0, max: 1 },
  embedding_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chunk' },
}, { timestamps: true });

const ChunkSchema = new mongoose.Schema({
  text: { type: String, required: true },
  embedding: { type: [Number], required: true },
  metadata: {
    source_type: String,
    source_id: String,
    date: String,
    people: [String],
    decision_id: String,
    url: String,
    chunk_index: Number,
    total_chunks: Number
  }
});

const PersonSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  decisions_made: [{ type: String, ref: 'Decision' }]
});

const ToolSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

const Decision = mongoose.model('Decision', DecisionSchema);
const Chunk = mongoose.model('Chunk', ChunkSchema);
const Person = mongoose.model('Person', PersonSchema);
const Tool = mongoose.model('Tool', ToolSchema);

module.exports = { Decision, Chunk, Person, Tool };
