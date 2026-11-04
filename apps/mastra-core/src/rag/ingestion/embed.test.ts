import { embedMany } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmbedder } from "./embed.js";

vi.mock("ai", () => ({ embedMany: vi.fn() }));

const embedManyMock = vi.mocked(embedMany);
const ollamaBaseUrl = "http://localhost:11434/api";

function sentValues(): string[] {
  return embedManyMock.mock.calls[0]![0].values;
}

describe("createEmbedder", () => {
  beforeEach(() => {
    embedManyMock.mockReset();
    embedManyMock.mockImplementation((async ({ values }: { values: string[] }) => ({
      embeddings: values.map(() => [0.1, 0.2]),
    })) as unknown as typeof embedMany);
  });

  it("adiciona o prefixo de documento do nomic-embed-text", async () => {
    const embed = createEmbedder({ ollamaBaseUrl, embeddingModel: "nomic-embed-text" });

    await expect(embed(["Bolsas"])).resolves.toEqual([[0.1, 0.2]]);
    expect(sentValues()).toEqual(["search_document: Bolsas"]);
  });

  it("usa o prefixo de pergunta na busca, mesmo com a tag do Ollama", async () => {
    const embed = createEmbedder(
      { ollamaBaseUrl, embeddingModel: "nomic-embed-text:latest" },
      "query",
    );

    await embed(["Onde fica o campus?"]);
    expect(sentValues()).toEqual(["search_query: Onde fica o campus?"]);
  });

  it("não altera o texto em modelos sem prefixo", async () => {
    const embed = createEmbedder({ ollamaBaseUrl, embeddingModel: "mxbai-embed-large" });

    await embed(["Bolsas"]);
    expect(sentValues()).toEqual(["Bolsas"]);
  });

  it("não chama o modelo quando não há textos", async () => {
    const embed = createEmbedder({ ollamaBaseUrl, embeddingModel: "nomic-embed-text" });

    await expect(embed([])).resolves.toEqual([]);
    expect(embedManyMock).not.toHaveBeenCalled();
  });
});
