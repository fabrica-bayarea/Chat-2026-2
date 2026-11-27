import { describe, expect, it } from "vitest";
import { loadLlmConfig, ollamaProviderOptions } from "./llm.config.js";

describe("loadLlmConfig", () => {
  it("usa janela de contexto de 8192 tokens por padrão", () => {
    expect(loadLlmConfig({ LLM_MODEL: "modelo" }).contextTokens).toBe(8192);
  });

  it("aceita outra janela de contexto pelo ambiente", () => {
    expect(loadLlmConfig({ LLM_MODEL: "modelo", LLM_CONTEXT_TOKENS: "16384" }).contextTokens).toBe(
      16384,
    );
  });

  it("rejeita janela de contexto menor que 2048", () => {
    expect(() => loadLlmConfig({ LLM_MODEL: "modelo", LLM_CONTEXT_TOKENS: "1024" })).toThrow(
      /LLM_CONTEXT_TOKENS/,
    );
  });
});

describe("ollamaProviderOptions", () => {
  it("envia a janela de contexto como num_ctx", () => {
    expect(ollamaProviderOptions({ contextTokens: 8192 })).toEqual({
      ollama: { options: { num_ctx: 8192 } },
    });
  });
});
