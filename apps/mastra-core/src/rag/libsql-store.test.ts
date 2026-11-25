import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PreparedChunk } from "./ingestion/metadata.js";
import { createLibSQLKnowledgeStore } from "./libsql-store.js";

function chunk(id: string, sourceId: string): PreparedChunk {
  return {
    id,
    metadata: {
      text: `Texto de ${id}`,
      sourceId,
      origin: "documento",
      type: "pdf",
      title: sourceId,
      chunkIndex: 0,
      totalChunks: 1,
      collectedAt: "2026-11-07T00:00:00.000Z",
      contentHash: id,
    },
  };
}

describe("createLibSQLKnowledgeStore", () => {
  let dir: string;
  let config: { vectorDbUrl: string; indexName: string };

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "rag-store-"));
    config = { vectorDbUrl: `file:${path.join(dir, "sub", "rag.db")}`, indexName: "base_teste" };
  });

  afterEach(async () => {
    // No Windows o arquivo .db continua aberto pelo LibSQL e não pode ser apagado aqui;
    // fica na pasta temporária do sistema
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  });

  it("devolve lista vazia quando a ingestão ainda não foi feita", async () => {
    const store = await createLibSQLKnowledgeStore(config);
    await expect(store.search([1, 0, 0], 4)).resolves.toEqual([]);
  });

  it("salva os trechos e encontra o mais parecido primeiro, com os metadados", async () => {
    const store = await createLibSQLKnowledgeStore(config);
    await store.reset();
    await store.saveSource("a.pdf", [chunk("a", "a.pdf")], [[1, 0, 0]]);
    await store.saveSource("b.pdf", [chunk("b", "b.pdf")], [[0, 1, 0]]);

    const [first, second] = await store.search([0.9, 0.1, 0], 2);

    expect(first).toMatchObject({ id: "a", metadata: { sourceId: "a.pdf", text: "Texto de a" } });
    expect(second?.id).toBe("b");
    expect(first!.score).toBeGreaterThan(second!.score);
  });

  it("começa do zero a cada nova ingestão", async () => {
    const store = await createLibSQLKnowledgeStore(config);
    await store.saveSource("a.pdf", [chunk("a", "a.pdf")], [[1, 0, 0]]);

    await store.reset();
    await store.saveSource("b.pdf", [chunk("b", "b.pdf")], [[0, 1, 0]]);

    const results = await store.search([1, 0, 0], 10);
    expect(results.map((result) => result.id)).toEqual(["b"]);
  });
});
