import { describe, expect, it } from "vitest";
import { formatSafeLog } from "./safe-logger.js";

describe("formatSafeLog", () => {
  it("erro do provedor: só nome e status, nunca o corpo da requisição ou da resposta", () => {
    const providerError = Object.assign(new Error("Internal Server Error"), {
      name: "AI_APICallError",
      statusCode: 500,
      requestBodyValues: { messages: [{ role: "user", content: "minha matrícula é 12345" }] },
      responseBody: '{"error":"segredo do provedor"}',
    });

    const line = formatSafeLog("Upstream LLM API error", [{ error: providerError }]);

    expect(line).toBe("[mastra] Upstream LLM API error (AI_APICallError 500)");
    expect(line).not.toContain("12345");
    expect(line).not.toContain("segredo");
  });

  it("argumentos que não são erro não aparecem", () => {
    const line = formatSafeLog("tool executed", [{ args: { matricula: "12345" } }, "texto solto"]);
    expect(line).toBe("[mastra] tool executed");
  });
});
