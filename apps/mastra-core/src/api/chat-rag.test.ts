import http from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PreparedChunk } from "../rag/ingestion/metadata.js";
import { createLibSQLKnowledgeStore } from "../rag/libsql-store.js";

// Teste de integração do RAG no chat: base vetorial LibSQL de verdade (arquivo temporário),
// agente Mastra de verdade e um Ollama falso que responde embeddings e o chat.
// Assim dá para conferir o que realmente chega no modelo e o que realmente chega na tela.

const BIBLIOTECA_TEXT = "A biblioteca do Campus Sul funciona de segunda a sexta, das 8h às 22h.";
const GUIA_IA_TEXT = "O uso de inteligência artificial em trabalhos deve ser declarado pelo aluno.";

// Vetores fixos: pergunta com "biblioteca" fica igual ao trecho da biblioteca, pergunta com
// "inteligência artificial" fica igual ao trecho do guia, o resto não parece com nada
const VECTOR_BIBLIOTECA = [1, 0, 0];
const VECTOR_GUIA_IA = [0, 0, 1];
const VECTOR_SEM_RELACAO = [0, 1, 0];

function fakeEmbedding(text: string): number[] {
  const lower = text.toLowerCase();
  if (lower.includes("biblioteca")) return VECTOR_BIBLIOTECA;
  if (lower.includes("inteligência artificial")) return VECTOR_GUIA_IA;
  return VECTOR_SEM_RELACAO;
}

function chunk(id: string, metadata: Omit<PreparedChunk["metadata"], "chunkIndex" | "totalChunks" | "collectedAt" | "contentHash">): PreparedChunk {
  return {
    id,
    metadata: {
      ...metadata,
      chunkIndex: 0,
      totalChunks: 1,
      collectedAt: "2026-11-25T00:00:00.000Z",
      contentHash: id,
    },
  };
}

type ChatRequestBody = {
  messages: Array<{ role: string; content: string }>;
  options?: { num_ctx?: number };
};

// Tudo que o Ollama falso recebeu no /api/chat (o que o agente mandou para o modelo)
const chatRequests: ChatRequestBody[] = [];
let embeddingModelMissing = false;

const fakeOllama = http.createServer((request, response) => {
  let raw = "";
  request.on("data", (data) => (raw += data));
  request.on("end", () => {
    const body = JSON.parse(raw || "{}");

    if (request.url === "/api/embed") {
      if (embeddingModelMissing) {
        response.writeHead(404, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "model \"nomic-embed-text\" not found, try pulling it first" }));
        return;
      }
      const inputs: string[] = Array.isArray(body.input) ? body.input : [body.input];
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          model: body.model,
          embeddings: inputs.map(fakeEmbedding),
          total_duration: 0,
          load_duration: 0,
          prompt_eval_count: 1,
        }),
      );
      return;
    }

    if (request.url === "/api/chat") {
      chatRequests.push(body);
      const line = (content: string, done: boolean) =>
        JSON.stringify({
          model: body.model,
          created_at: "2026-11-25T00:00:00.000Z",
          message: { role: "assistant", content },
          done,
          ...(done ? { done_reason: "stop", prompt_eval_count: 1, eval_count: 2 } : {}),
        });
      response.writeHead(200, { "Content-Type": "application/x-ndjson" });
      response.end([line("Resposta ", false), line("de teste.", false), line("", true)].join("\n") + "\n");
      return;
    }

    response.writeHead(404).end();
  });
});

type StreamEvent = { type: string; [key: string]: unknown };

// Lê a resposta SSE do chat e devolve os eventos em ordem
async function readEvents(response: Response): Promise<StreamEvent[]> {
  const body = await response.text();
  return body
    .split("\n")
    .filter((line) => line.startsWith("data: ") && line !== "data: [DONE]")
    .map((line) => JSON.parse(line.slice("data: ".length)) as StreamEvent);
}

function userMessage(text: string) {
  return { id: `u-${Math.random()}`, role: "user" as const, parts: [{ type: "text", text }] };
}

// Texto que o modelo recebeu como sistema (instruções do agente + contexto do RAG)
function systemTextSentToModel(): string {
  const last = chatRequests.at(-1);
  expect(last, "o agente não chamou o modelo").toBeDefined();
  return last!.messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n");
}

let createChatResponse: typeof import("./chat.stream.js").createChatResponse;
let dir: string;
const originalEnv = { ...process.env };

beforeAll(async () => {
  await new Promise<void>((resolve) => fakeOllama.listen(0, "127.0.0.1", resolve));
  const port = (fakeOllama.address() as AddressInfo).port;

  dir = await mkdtemp(path.join(tmpdir(), "chat-rag-"));
  const vectorDbUrl = `file:${path.join(dir, "rag.db")}`;
  const indexName = "base_teste_chat";

  // Base vetorial com dois trechos: uma página do site e um PDF
  const store = await createLibSQLKnowledgeStore({ vectorDbUrl, indexName });
  await store.saveSource(
    "https://www.iesb.br/biblioteca/",
    [
      chunk("biblioteca", {
        text: BIBLIOTECA_TEXT,
        sourceId: "https://www.iesb.br/biblioteca/",
        origin: "site",
        type: "html",
        title: "Biblioteca",
      }),
    ],
    [VECTOR_BIBLIOTECA],
  );
  await store.saveSource(
    "guia-uso-ia.pdf",
    [
      chunk("guia", {
        text: GUIA_IA_TEXT,
        sourceId: "guia-uso-ia.pdf",
        origin: "documento",
        type: "pdf",
        title: "Guia de uso de IA",
        page: 4,
      }),
    ],
    [VECTOR_GUIA_IA],
  );

  process.env.LLM_MODEL = "modelo-teste";
  process.env.OLLAMA_BASE_URL = `http://127.0.0.1:${port}/api`;
  process.env.LLM_TIMEOUT_MS = "10000";
  process.env.RAG_VECTOR_DB_URL = vectorDbUrl;
  process.env.RAG_INDEX_NAME = indexName;
  process.env.RAG_EMBEDDING_MODEL = "nomic-embed-text";

  // Import depois do env: o agente lê LLM_MODEL e OLLAMA_BASE_URL ao ser criado
  ({ createChatResponse } = await import("./chat.stream.js"));
});

afterAll(async () => {
  process.env = originalEnv;
  fakeOllama.closeAllConnections();
  await new Promise<void>((resolve) => fakeOllama.close(() => resolve()));
  // No Windows o .db continua aberto pelo LibSQL; fica na pasta temporária do sistema
  await rm(dir, { recursive: true, force: true }).catch(() => {});
});

beforeEach(() => {
  embeddingModelMissing = false;
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("chat com RAG", () => {
  it("pergunta institucional: trechos vão para o agente como contexto e a fonte vai para a tela", async () => {
    const response = createChatResponse(
      [userMessage("Qual o horário da biblioteca?")],
      AbortSignal.timeout(15000),
    );
    const events = await readEvents(response);

    // O agente recebeu as instruções dele E o contexto do RAG com o trecho e a fonte
    const system = systemTextSentToModel();
    expect(chatRequests.at(-1)?.options?.num_ctx).toBe(8192);
    expect(system).toContain("Você é o assistente virtual da faculdade");
    expect(system).toContain("BASE DE CONHECIMENTO INSTITUCIONAL");
    expect(system).toContain(BIBLIOTECA_TEXT);
    expect(system).toContain("Fonte: Biblioteca — iesb.br — https://www.iesb.br/biblioteca/");
    // Trecho sem relação com a pergunta não entra
    expect(system).not.toContain(GUIA_IA_TEXT);

    // A tela recebe a fonte e o texto do modelo, sem erro
    expect(events).toContainEqual({
      type: "source-url",
      sourceId: "rag-1",
      url: "https://www.iesb.br/biblioteca/",
      title: "Biblioteca — iesb.br",
    });
    expect(events.filter((event) => event.type.startsWith("source-"))).toHaveLength(1);
    expect(events.some((event) => event.type === "text-delta")).toBe(true);
    expect(events.some((event) => event.type === "error")).toBe(false);
  });

  it("fonte de documento chega como source-document com arquivo e página", async () => {
    const response = createChatResponse(
      [userMessage("Posso usar inteligência artificial no trabalho?")],
      AbortSignal.timeout(15000),
    );
    const events = await readEvents(response);

    expect(systemTextSentToModel()).toContain(GUIA_IA_TEXT);
    expect(events).toContainEqual({
      type: "source-document",
      sourceId: "rag-1",
      mediaType: "application/pdf",
      title: "Guia de uso de IA (guia-uso-ia.pdf), p. 4",
      filename: "guia-uso-ia.pdf",
    });
  });

  it("pergunta sem conteúdo relevante: agente é avisado para não inventar e nenhuma fonte aparece", async () => {
    const response = createChatResponse(
      [userMessage("Qual a situação da minha matrícula 12345?")],
      AbortSignal.timeout(15000),
    );
    const events = await readEvents(response);

    const system = systemTextSentToModel();
    expect(system).toContain("Nenhum trecho relevante foi encontrado");
    expect(system).toContain("Não apresente nenhuma informação como vinda da base de conhecimento");
    expect(system).not.toContain(BIBLIOTECA_TEXT);
    expect(system).not.toContain(GUIA_IA_TEXT);

    expect(events.some((event) => event.type.startsWith("source-"))).toBe(false);
    expect(events.some((event) => event.type === "text-delta")).toBe(true);
  });

  it("modelo de embedding não baixado: chat continua respondendo, sem contexto e sem fonte", async () => {
    embeddingModelMissing = true;

    const response = createChatResponse(
      [userMessage("Qual o horário da biblioteca?")],
      AbortSignal.timeout(15000),
    );
    const events = await readEvents(response);

    expect(systemTextSentToModel()).toContain("Nenhum trecho relevante foi encontrado");
    expect(events.some((event) => event.type.startsWith("source-"))).toBe(false);
    expect(events.some((event) => event.type === "text-delta")).toBe(true);
    expect(events.some((event) => event.type === "error")).toBe(false);
  });

  it("segunda mensagem da conversa: histórico com fontes não quebra e a busca usa a última pergunta", async () => {
    const history = [
      userMessage("Qual o horário da biblioteca?"),
      {
        id: "a-1",
        role: "assistant" as const,
        parts: [
          { type: "step-start" },
          {
            type: "source-url",
            sourceId: "rag-1",
            url: "https://www.iesb.br/biblioteca/",
            title: "Biblioteca — iesb.br",
          },
          { type: "text", text: "A biblioteca funciona das 8h às 22h. Fonte: Biblioteca." },
        ],
      },
      userMessage("Posso usar inteligência artificial no trabalho?"),
    ];

    const response = createChatResponse(history, AbortSignal.timeout(15000));
    expect(response.status).toBe(200);
    const events = await readEvents(response);

    const system = systemTextSentToModel();
    expect(system).toContain(GUIA_IA_TEXT);
    expect(system).not.toContain(BIBLIOTECA_TEXT);
    expect(events.some((event) => event.type === "error")).toBe(false);
    expect(events.some((event) => event.type === "text-delta")).toBe(true);
  });

  it("pergunta curta de continuação: a busca usa também a pergunta anterior", async () => {
    const history = [
      userMessage("Qual o horário da biblioteca?"),
      {
        id: "a-1",
        role: "assistant" as const,
        parts: [{ type: "text", text: "A biblioteca funciona das 8h às 22h. Fonte: Biblioteca." }],
      },
      userMessage("E no sábado?"),
    ];

    const response = createChatResponse(history, AbortSignal.timeout(15000));
    expect(response.status).toBe(200);
    const events = await readEvents(response);

    expect(systemTextSentToModel()).toContain(BIBLIOTECA_TEXT);
    expect(events.some((event) => event.type === "source-url")).toBe(true);
  });
});
