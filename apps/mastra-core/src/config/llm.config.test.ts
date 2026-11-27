import { describe, expect, it } from "vitest";
import { loadLlmConfig, ollamaProviderOptions } from "./llm.config.js";

describe("loadLlmConfig", () => {
  it("usa janela de 8192 tokens, temperatura 0 e timeout de 120 s por padrão", () => {
    const config = loadLlmConfig({ LLM_MODEL: "modelo" });
    expect(config.numCtx).toBe(8192);
    expect(config.temperature).toBe(0);
    expect(config.timeoutMs).toBe(120_000);
  });

  it("aceita outra janela de contexto pelo ambiente", () => {
    expect(loadLlmConfig({ LLM_MODEL: "modelo", LLM_NUM_CTX: "16384" }).numCtx).toBe(16384);
  });

  it("rejeita janela de contexto menor que 1024", () => {
    expect(() => loadLlmConfig({ LLM_MODEL: "modelo", LLM_NUM_CTX: "512" })).toThrow(/LLM_NUM_CTX/);
  });
});

describe("ollamaProviderOptions", () => {
  it("envia janela de contexto, limite de resposta e temperatura nas opções do Ollama", () => {
    const config = loadLlmConfig({ LLM_MODEL: "modelo" });
    expect(ollamaProviderOptions(config)).toEqual({
      ollama: { options: { num_ctx: 8192, num_predict: 1024, temperature: 0 } },
    });
  });
});
