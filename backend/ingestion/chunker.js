function chunkText(text, chunkSize = 2000, overlap = 200) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push({
      text: text.slice(start, end),
      chunk_index: chunks.length,
      start_char: start,
      end_char: end
    });
    start += chunkSize - overlap;
  }

  return chunks;
}

module.exports = { chunkText };
