import { randomUUID } from "node:crypto";
import { toAISdkStream } from "@mastra/ai-sdk";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { loadContextConfig } from "../config/context.config.js";
import { loadLlmConfig, ollamaProviderOptions } from "../config/llm.config.js";
import { buildContextWindow, type IncomingMessage } from "../context/context-window.js";
import { mastra } from "../mastra.config.js";
import { contactKeys } from "../rag/contacts.js";
import { findKnowledgeForQuestion } from "../rag/knowledge-context.js";
import type { Citation } from "../rag/retrieval/citation.js";
import { createContactGuard } from "./contact-guard.js";
import { classifyStreamError, STREAM_ERROR_MESSAGES } from "./error.js";
import { getSearchQuestion } from "./search-question.js";
import { buildSiteLinks, stripSiteLinks } from "./site-links.js";

// Texto de todas as mensagens do usuário: contato que ele mesmo escreveu pode voltar na resposta
function userTexts(messages: IncomingMessage[]): string {
  return messages
    .filter((message) => message.role === "user")
    .flatMap((message) => message.parts)
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("\n");
}

const DOCUMENT_MEDIA_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
};

// Fonte do RAG no formato de parte de mensagem do AI SDK, para a interface mostrar
function citationToStreamPart(citation: Citation, index: number): UIMessageChunk {
  const sourceId = `rag-${index + 1}`;

  if (citation.url) {
    return { type: "source-url", sourceId, url: citation.url, title: citation.label };
  }

  const document = citation.document ?? "";
  const extension = document.split(".").pop()?.toLowerCase() ?? "";
  return {
    type: "source-document",
    sourceId,
    mediaType: DOCUMENT_MEDIA_TYPES[extension] ?? "application/octet-stream",
    title: citation.label,
    filename: document,
  };
}

export function createChatResponse(
  messages: IncomingMessage[],
  clientSignal: AbortSignal,
): Response {
  const llm = loadLlmConfig();
  const agent = mastra.getAgent("collegeAgent");

  // Timeout de geração (LLM_TIMEOUT_MS)
  const timeoutSignal = AbortSignal.timeout(llm.timeoutMs);

  // A geração é interrompida se o cliente cancelar (botão "parar", aba fechada) ou se o tempo estourar
  const abortSignal = AbortSignal.any([clientSignal, timeoutSignal]);

  let finished = false;
  clientSignal.addEventListener(
    "abort",
    () => {
      if (!finished) console.log("[chat] cliente cancelou a requisição; geração interrompida.");
    },
    { once: true },
  );

  // O useChat sempre envia id, mas o schema o aceita como opcional; garantimos um aqui
  const uiMessages = messages.map((message) => ({
    ...message,
    id: message.id ?? randomUUID(),
  })) as UIMessage[];

  // Para o modelo vai só a janela de contexto (últimas mensagens, só texto, até o limite
  // de caracteres), não a conversa inteira
  const contextMessages = buildContextWindow(
    stripSiteLinks(uiMessages as IncomingMessage[]),
    loadContextConfig(),
  );

  // Detalhe técnico e código só no log; o usuário recebe o texto em pt-BR
  const reportError = (error: unknown): string => {
    // Cliente já foi embora: o cancelamento costuma gerar um erro, mas ninguém está ouvindo
    if (clientSignal.aborted) return STREAM_ERROR_MESSAGES.INTERNAL_ERROR;

    const code = classifyStreamError(error, timeoutSignal);
    console.error(`[chat] ${code}:`, error);
    return STREAM_ERROR_MESSAGES[code];
  };

  const stream = createUIMessageStream({
    originalMessages: uiMessages,
    execute: async ({ writer }) => {
      try {
        // STATUS_UPDATE: logo que o processamento começa
        writer.write({ type: "data-status", data: { state: "thinking" }, transient: true });

        // RAG: busca trechos da base institucional para a pergunta do usuário (com a anterior,
        // se for uma continuação curta). O resultado vai para o agente como mensagem de
        // sistema (com os trechos ou com o aviso de que nada foi encontrado). Falha na base
        // não impede a resposta.
        const knowledge = await findKnowledgeForQuestion(getSearchQuestion(messages), abortSignal);
        if (clientSignal.aborted) return;

        const agentStream = await agent.stream(contextMessages as UIMessage[], {
          modelSettings: { temperature: llm.temperature, maxOutputTokens: llm.maxTokens },
          providerOptions: ollamaProviderOptions(llm),
          // Sem ferramentas: uma chamada ao modelo por resposta
          maxSteps: 1,
          abortSignal,
          system: knowledge.systemMessage,
        });

        let generating = false;
        let failed = false;

        // Contatos na resposta só se estiverem nos trechos enviados ou no que o usuário escreveu
        const contactGuard = createContactGuard(
          new Set([...knowledge.allowedContacts, ...contactKeys(userTexts(messages))]),
          knowledge.topics,
        );

        // Resposta como foi para a tela, para decidir os links do fim
        let answer = "";

        for await (const part of toAISdkStream(agentStream, { from: "agent", version: "v7" })) {
          if (clientSignal.aborted) break; // ninguém está ouvindo: para de processar

          // Erros reportados dentro do stream
          if (part.type === "error") {
            failed = true;
            writer.write({ type: "error", errorText: reportError(part.errorText) });
            continue;
          }

          // STATUS_UPDATE: no primeiro token
          if (part.type === "text-delta" && !generating) {
            generating = true;
            writer.write({ type: "data-status", data: { state: "generating" }, transient: true });
          }

          // O texto passa pelo filtro de contatos antes de ir para a tela
          if (part.type === "text-delta") {
            const safe = contactGuard.push(part.id, part.delta);
            answer += safe;
            if (safe) writer.write({ type: "text-delta", id: part.id, delta: safe });
            continue;
          }
          if (part.type === "text-end") {
            const rest = contactGuard.flush(part.id);
            answer += rest;
            if (rest) writer.write({ type: "text-delta", id: part.id, delta: rest });

            const links = buildSiteLinks({ answer, sources: knowledge.sources });
            if (links) writer.write({ type: "text-delta", id: part.id, delta: links });
          }

          // TEXT_CHUNK (text-delta), start, text-start, text-end, finish...
          // O adaptador v7 usa o mesmo protocolo, mas declara JSON de metadata como readonly.
          // O writer apenas encaminha o evento; não modifica esses objetos.
          writer.write(part as UIMessageChunk);

          // Fontes do RAG logo depois do início da mensagem do assistente
          if (part.type === "start") {
            knowledge.sources.forEach((citation, index) => {
              writer.write(citationToStreamPart(citation, index));
            });
          }
        }

        // Stream encerrado sem text-end (timeout, erro): o texto segurado ainda vai para a tela
        for (const [id, rest] of contactGuard.flushAll()) {
          writer.write({ type: "text-delta", id, delta: rest });
        }
        if (contactGuard.redacted > 0) {
          console.warn(`[rag] ${contactGuard.redacted} contato(s) fora da base retirado(s) da resposta.`);
        }

        // Estourar o timeout pode encerrar o stream sem erro algum; nesse caso avisamos aqui
        if (!failed && timeoutSignal.aborted && !clientSignal.aborted) {
          writer.write({ type: "error", errorText: reportError(timeoutSignal.reason) });
        }
      } finally {
        finished = true;
      }
    },
    // Erros lançados (em vez de reportados no stream)
    onError: reportError,
  });

  return createUIMessageStreamResponse({ stream });
}