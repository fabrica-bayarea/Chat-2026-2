import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { Agent } from "@mastra/core/agent";
import { standardSchemaToJSONSchema } from "@mastra/core/schema";
import { criarApiFalsa } from "../../mcp-server/test/api-falsa.js";
import { loadMcpConfig, type McpConfig } from "../src/config/mcp.config.js";
import { McpToolsClient, McpCommunicationError } from "../src/mcp/client.js";

const { server, requisicoes } = criarApiFalsa();
let config: McpConfig;
let client: McpToolsClient;

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  config = {
    command: process.execPath,
    args: ["--import", "tsx", "src/server.ts"],
    cwd: fileURLToPath(new URL("../../mcp-server", import.meta.url)),
    env: { API_MOCK_URL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, API_MOCK_TIMEOUT_MS: "1000" },
    timeoutMs: 5000,
  };
  client = new McpToolsClient(config);
});

after(async () => {
  await client.close();
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test("descobre schema e executa matrícula pela ferramenta entregue ao agente", async () => {
  const agent = new Agent({ id: "test", name: "test", instructions: "Use ferramentas.", model: "openai/gpt-4o-mini", tools: () => client.listTools() });
  const tools = await agent.listTools();
  const tool = tools.consultar_matricula;
  assert.ok(tool);
  assert.ok("inputSchema" in tool && tool.inputSchema);
  const schema = standardSchemaToJSONSchema(tool.inputSchema);
  assert.deepEqual(schema.required, ["matricula"]);
  assert.ok(tool.execute);
  const result = await (tool.execute as Function)({ matricula: "12345" }, {});
  assert.equal(result.structuredContent.status, "encontrada");
  assert.equal(result.structuredContent.dados.nome, "Maria Silva");
  assert.equal(requisicoes.at(-1), "/matriculas/12345");
});

test("matrícula inexistente mantém resultado estruturado e conteúdo MCP", async () => {
  const result = await client.callTool("consultar_matricula", { matricula: "99999" });
  assert.deepEqual(result.structuredContent, { status: "nao_encontrada", matricula: "99999" });
  assert.ok(Array.isArray(result.content));
  assert.notEqual(result.isError, true);
});

test("schema rejeita entrada inválida antes de acessar API", async () => {
  const before = requisicoes.length;
  for (const args of [{}, { matricula: 12345 }, { matricula: "" }]) {
    const result = await client.callTool("consultar_matricula", args);
    assert.equal(result.isError, true);
  }
  assert.equal(requisicoes.length, before);
});

test("preserva isError para falhas na API", async () => {
  const result = await client.callTool("consultar_matricula", { matricula: "erro500" });
  assert.equal(result.isError, true);
});

test("timeout MCP é tratado e conexão permite nova consulta", async () => {
  const short = new McpToolsClient({ ...config, env: { ...config.env, API_MOCK_TIMEOUT_MS: "10000" } });
  try {
    await short.listTools();
    await assert.rejects(short.callTool("consultar_matricula", { matricula: "lenta" }), McpCommunicationError);
    const result = await short.callTool("consultar_matricula", { matricula: "12345" });
    assert.ok(result.structuredContent && typeof result.structuredContent === "object" && "status" in result.structuredContent);
    assert.equal(result.structuredContent.status, "encontrada");
  } finally {
    await short.close();
  }
});

test("processo encerrado durante handshake não expõe configuração", async () => {
  const broken = new McpToolsClient({ ...config, args: ["-e", "process.exit(1)"] });
  try {
    await assert.rejects(broken.listTools(), McpCommunicationError);
    await assert.rejects(broken.listTools(), McpCommunicationError);
  } finally {
    await broken.close();
  }
});

test("conexão pode reabrir após fechamento", async () => {
  await client.close();
  assert.ok((await client.listTools()).consultar_matricula);
});

test("ferramenta descoberta retorna erro amigável se servidor fica indisponível", async () => {
  const mutableConfig = { ...config };
  const disconnected = new McpToolsClient(mutableConfig);
  try {
    const tools = await disconnected.listTools();
    await disconnected.close();
    mutableConfig.args = ["-e", "process.exit(1)"];
    const tool = tools.consultar_matricula!;
    assert.ok("execute" in tool);
    const result = await (tool.execute as Function)({ matricula: "12345" }, {});
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Não foi possível comunicar/);
  } finally {
    await disconnected.close();
  }
});

test("configuração é opcional, valida JSON e não vaza segredo em erro", () => {
  assert.equal(loadMcpConfig({}), undefined);
  assert.throws(() => loadMcpConfig({ MCP_COMMAND: "node", MCP_ENV: "secret-invalid-json" }),
    (error: Error) => !error.message.includes("secret-invalid-json"));
  assert.throws(() => loadMcpConfig({ MCP_COMMAND: "node", MCP_TIMEOUT_MS: "0" }));
  assert.deepEqual(loadMcpConfig({ MCP_COMMAND: "node", MCP_ARGS: '["server.js"]' })?.args, ["server.js"]);
});

