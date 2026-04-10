const { callMcpTool } = require('../mcpClient');
const { enqueueIngestion } = require('./queue');

const SOURCE_TOOL_CANDIDATES = {
  slack: ['list_channels', 'fetch_channel_messages', 'search_messages', 'get_recent_messages'],
  gmail: ['list_messages', 'search_messages', 'get_messages', 'fetch_emails'],
  gdrive: ['list_files', 'search_files', 'get_file_contents', 'fetch_documents']
};

function normalizeItems(result, sourceType) {
  if (!result) return [];

  const content = Array.isArray(result.content) ? result.content : [result.content].filter(Boolean);
  const text = content
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item.text === 'string') return item.text;
      if (item && typeof item.content === 'string') return item.content;
      return '';
    })
    .filter(Boolean)
    .join('\n');

  if (!text) return [];

  return [{
    source_id: `${sourceType}-${Date.now()}`,
    text,
    timestamp: new Date().toISOString(),
    url: null
  }];
}

async function fetchFromSource(serverName, toolArgs = {}) {
  const toolNames = SOURCE_TOOL_CANDIDATES[serverName] || [];

  for (const toolName of toolNames) {
    try {
      const result = await callMcpTool(serverName, toolName, toolArgs);
      const items = normalizeItems(result, serverName === 'gdrive' ? 'google_drive' : serverName);
      if (items.length > 0) return { toolName, items };
    } catch (err) {
      const message = String(err.message || err);
      if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('unknown tool')) {
        continue;
      }
      throw err;
    }
  }

  return { toolName: null, items: [] };
}

async function ingestFromMcpSource(serverName, toolArgs = {}) {
  const normalizedSourceType = serverName === 'gdrive' ? 'google_drive' : serverName;
  const { toolName, items } = await fetchFromSource(serverName, toolArgs);

  if (items.length === 0) {
    return {
      status: 'empty',
      source_type: normalizedSourceType,
      tool: toolName,
      message: `No text items were returned from ${serverName}`
    };
  }

  await enqueueIngestion(items, normalizedSourceType);

  return {
    status: 'queued',
    source_type: normalizedSourceType,
    tool: toolName,
    count: items.length
  };
}

module.exports = { ingestFromMcpSource };
