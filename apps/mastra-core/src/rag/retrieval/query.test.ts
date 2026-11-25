import { describe, expect, it, vi } from "vitest";
import type { Embedder } from "../ingestion/embed.js";
import { embedQuery, normalizeQuery, RetrievalError } from "./query.js";

describe("normalizeQuery", () => {
  it("remove espaços e quebras de linha extras", () => {
    expect(normalizeQuery("  Onde   fica o\n campus?  ", 100)).toBe("Onde fica o campus?");
  });

  it("rejeita consulta vazia", () => {
    expect(() => normalizeQuery(" \n\t ", 100)).toThrow(RetrievalError);
    expect(() => normalizeQuery(" \n\t ", 100)).toThrow("A consulta está vazia.");
  });

  it("rejeita consulta acima do limite", () => {
    expect(() => normalizeQuery("a".repeat(11), 10)).toThrow(/limite de 10 caracteres/);
  });
});

describe("embedQuery", () => {
  it("devolve o vetor gerado para a consulta", async () => {
    const embed = vi.fn<Embedder>(async () => [[0.1, 0.2]]);

    await expect(embedQuery("biblioteca", embed)).resolves.toEqual([0.1, 0.2]);
    expect(embed).toHaveBeenCalledWith(["biblioteca"]);
  });

  it("converte falha do modelo em erro de indisponibilidade", async () => {
    const embed = vi.fn<Embedder>(async () => {
      throw new TypeError("fetch failed");
    });

    await expect(embedQuery("biblioteca", embed)).rejects.toMatchObject({
      name: "RetrievalError",
      kind: "unavailable",
    });
  });
});
