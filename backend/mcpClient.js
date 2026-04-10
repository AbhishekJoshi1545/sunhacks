const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const fs = require('fs');
const path = require('path');

function loadMcpConfig() {
  const raw = fs.readFileSync(path.join(__dirname, '../mcp_config.json'), 'utf8');
  return JSON.parse(raw.replace(/\${(\w+)}/g, (_, key) => process.env[key] || ''));
}

const mcpClients = {};

async function getMcpClient(serverName) {
  if (mcpClients[serverName]) return mcpClients[serverName];

  const config = loadMcpConfig();
  const serverConfig = config.mcpServers[serverName];
  if (!serverConfig) throw new Error(`No MCP config for: ${serverName}`);

  const transport = new StdioClientTransport({
    command: serverConfig.command,
    args: serverConfig.args,
    env: { ...process.env, ...serverConfig.env }
  });

  const client = new Client({ name: 'org-memory-engine', version: '1.0.0' }, {
    capabilities: { tools: {} }
  });

  await client.connect(transport);
  mcpClients[serverName] = client;
  return client;
}

async function listMcpTools(serverName) {
  const client = await getMcpClient(serverName);
  return client.listTools();
}

async function callMcpTool(serverName, toolName, args = {}) {
  const client = await getMcpClient(serverName);
  return client.callTool({ name: toolName, arguments: args });
}

async function listMcpResources(serverName) {
  const client = await getMcpClient(serverName);
  return client.listResources();
}

module.exports = { getMcpClient, listMcpTools, callMcpTool, listMcpResources };
