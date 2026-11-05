import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { criarApiFalsa } from "../../../mcp-server/test/api-falsa.js";
import { closeMcpClient } from "../mcp/client.js";

// Teste opt-in: usa o Ollama/modelo do .env e dados acadêmicos fictícios.
const { server, requisicoes } = criarApiFalsa();
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
process.env.MCP_COMMAND = process.execPath;
process.env.MCP_ARGS = JSON.stringify(["--import", "tsx", "src/server.ts"]);
process.env.MCP_CWD = fileURLToPath(new URL("../../../mcp-server", import.meta.url));
process.env.MCP_ENV = JSON.stringify({
  API_MOCK_URL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
  API_MOCK_TIMEOUT_MS: "3000",
});
process.env.LLM_TIMEOUT_MS = "120000";
process.env.MCP_TIMEOUT_MS = "5000";

try {
  // Imports depois da configuração: o agente carrega o modelo ao ser criado.
  const { askAgent } = await import("../chat.js");
  const { createChatResponse } = await import("../api/chat.stream.js");
  const prompt = "Consulte minha matrícula 12345 e informe meu nome e situação da matrícula.";

  const answer = await askAgent(prompt, randomUUID());
  assert.ok(requisicoes.includes("/matriculas/12345"), "O modelo não executou a consulta.");
  assert.match(answer, /Maria/i);
  assert.match(answer, /ativa/i);
  console.log("[generate]", answer);

  requisicoes.length = 0;
  const messages = [{ role: "user" as const, parts: [{ type: "text", text: prompt }] }];
  const response = createChatResponse(messages, AbortSignal.timeout(120000));
  const body = await response.text();
  const events = body.split("\n")
    .filter((line) => line.startsWith("data: ") && line !== "data: [DONE]")
    .map((line) => JSON.parse(line.slice(6)));
  assert.ok(!events.some((event) => event.type === "error"), "O streaming retornou erro.");
  assert.ok(events.some((event) => event.type === "tool-output-available"), "Resultado da ferramenta não chegou ao stream.");
  assert.ok(requisicoes.includes("/matriculas/12345"), "O streaming não executou a consulta.");
  const text = events.filter((event) => event.type === "text-delta").map((event) => event.delta).join("");
  assert.match(text, /Maria/i);
  assert.match(text, /ativa/i);
  console.log("[stream]", text);
  console.log("Consulta com LLM real aprovada em generate e streaming.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await closeMcpClient();
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
