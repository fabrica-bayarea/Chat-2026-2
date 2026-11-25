import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildKnowledgeContext, type Retrieve } from "./knowledge-context.js";

describe("buildKnowledgeContext", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mensagem sem texto (só anexo) não busca na base", async () => {
    const retrieve = vi.fn<Retrieve>();

    const context = await buildKnowledgeContext("   ", retrieve);

    expect(retrieve).not.toHaveBeenCalled();
    expect(context.found).toBe(false);
    expect(context.systemMessage).toContain("Nenhum trecho relevante");
  });

  it("cancelamento do chat para de esperar a busca", async () => {
    const neverEnds: Retrieve = () => new Promise(() => {});
    const controller = new AbortController();

    const pending = buildKnowledgeContext("onde fica a biblioteca?", neverEnds, controller.signal);
    controller.abort();

    const context = await pending;
    expect(context.found).toBe(false);
    expect(context.sources).toEqual([]);
  });

  it("erro na busca não vaza a pergunta no log", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failing: Retrieve = async () => {
      throw new Error("falhou com a pergunta: minha senha é 123");
    };

    const context = await buildKnowledgeContext("minha senha é 123", failing);

    expect(context.found).toBe(false);
    const logged = warn.mock.calls.flat().join(" ");
    expect(logged).not.toContain("senha");
  });
});
