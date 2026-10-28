import { loadMcpConfig } from "../config/mcp.config.js";
import { McpToolsClient } from "../mcp/client.js";

const config = loadMcpConfig();
if (!config) throw new Error("Defina MCP_COMMAND no .env para executar a integração.");
const client = new McpToolsClient(config);
try {
  const tools = await client.listTools();
  console.log("Ferramentas:", Object.keys(tools));
  if (!tools.consultar_matricula) throw new Error("Servidor não oferece consultar_matricula.");
  const result = await client.callTool("consultar_matricula", { matricula: process.argv[2] ?? "12345" });
  console.log(JSON.stringify(result, null, 2));
  if (result.isError) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falha na integração MCP.");
  process.exitCode = 1;
} finally {
  await client.close();
}
