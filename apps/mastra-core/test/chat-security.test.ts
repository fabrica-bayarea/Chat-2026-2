import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { inspect } from "node:util";
import { test } from "vitest";

test("erro do provedor não expõe conteúdo sensível no log do chat ou na resposta", async () => {
  const secret = "private-student-test-value";
  const server = http.createServer((_request, response) => {
    response.writeHead(401, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: secret }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const originalEnv = { ...process.env };
  const originalConsole = { error: console.error, warn: console.warn, info: console.info, log: console.log };
  const logs: unknown[][] = [];
  // Tudo que qualquer parte do sistema imprimir (chat, Mastra, bibliotecas)
  const allLogs: unknown[][] = [];
  try {
    process.env.LLM_MODEL = "test-model";
    process.env.OLLAMA_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
    process.env.MCP_COMMAND = "";
    process.env.LLM_TIMEOUT_MS = "5000";
    process.env.MASTRA_STORAGE_URL = `file:${path.join(tmpdir(), `chat-security-${process.pid}.db`)}`;
    console.error = (...args) => { logs.push(args); allLogs.push(args); };
    console.warn = (...args) => { allLogs.push(args); };
    console.info = (...args) => { allLogs.push(args); };
    console.log = (...args) => { allLogs.push(args); };
    const { createChatResponse } = await import("../src/api/chat.stream.js");
    const messages = [{ id: "m-1", role: "user" as const, parts: [{ type: "text" as const, text: "Olá" }] }];
    const body = await createChatResponse(messages, AbortSignal.timeout(10000)).text();
    assert.match(body, /"type":"error"/);
    assert.ok(!body.includes(secret));
    const chatLogs = logs.filter((args) => String(args[0]).startsWith("[chat]"));
    assert.ok(chatLogs.length > 0);
    for (const args of chatLogs) {
      assert.equal(args.length, 1, "Não registrar o objeto bruto do erro.");
      assert.match(String(args[0]), /^\[chat\] [A-Z_]+$/);
    }
    // Nenhum log (inclusive do Mastra) traz o corpo do erro do provedor nem a conversa
    const everything = allLogs.map((args) => args.map((arg) => (typeof arg === "string" ? arg : inspect(arg, { depth: 8 }))).join(" ")).join("\n");
    assert.ok(!everything.includes(secret), "Log com o corpo do erro do provedor.");
    assert.ok(!everything.includes("Olá"), "Log com a mensagem do usuário.");
  } finally {
    Object.assign(console, originalConsole);
    for (const name of ["LLM_MODEL", "OLLAMA_BASE_URL", "MCP_COMMAND", "LLM_TIMEOUT_MS", "MASTRA_STORAGE_URL"]) {
      if (originalEnv[name] === undefined) delete process.env[name];
      else process.env[name] = originalEnv[name];
    }
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
