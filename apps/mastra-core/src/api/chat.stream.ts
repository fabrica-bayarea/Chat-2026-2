import { randomUUID } from "node:crypto";
import { toAISdkStream } from "@mastra/ai-sdk";
import { RequestContext } from "@mastra/core/request-context";
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage, type UIMessageChunk } from "ai";
import type { LoggedStudent } from "../auth/logged-student.js";
import { loadLlmConfig } from "../config/llm.config.js";
import type { StoredMessage } from "../context/chat-history.js";
import { mastra } from "../mastra.config.js";
import { classifyStreamError, STREAM_ERROR_MESSAGES } from "./error.js";

export type ChatResponseOptions = {
  // Aluno da sessão (verificado pelo backend). As ferramentas de dados do aluno usam só ele.
  student?: LoggedStudent;
  // Chamado com a resposta final do assistente, para guardar no histórico do servidor
  onAssistantReply?: (message: StoredMessage) => Promise<void>;
};

// Recebe a conversa JÁ CONFIÁVEL (montada pelo servidor, ver context/chat-history.ts)
export function createChatResponse(
  messages: StoredMessage[],
  clientSignal: AbortSignal,
  options: ChatResponseOptions = {},
): Response {
  const { temperature, maxTokens, timeoutMs } = loadLlmConfig();
  const agent = mastra.getAgent("collegeAgent");

  // Timeout de geração (LLM_TIMEOUT_MS)
  const timeoutSignal = AbortSignal.timeout(timeoutMs);

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

  const uiMessages = messages as UIMessage[];

  // Quem está conversando, para as ferramentas. Visitante: contexto sem aluno.
  const requestContext = new RequestContext();
  if (options.student) requestContext.set("aluno", options.student);

  // Não registrar o erro bruto: pode incluir prompts, dados de ferramentas ou credenciais.
  const reportError = (error: unknown): string => {
    // Cliente já foi embora: o cancelamento costuma gerar um erro, mas ninguém está ouvindo
    if (clientSignal.aborted) return STREAM_ERROR_MESSAGES.INTERNAL_ERROR;

    const code = classifyStreamError(error, timeoutSignal);
    console.error(`[chat] ${code}`);
    return STREAM_ERROR_MESSAGES[code];
  };

  const stream = createUIMessageStream({
    originalMessages: uiMessages,
    execute: async ({ writer }) => {
      try {
        // STATUS_UPDATE: logo que o processamento começa
        writer.write({ type: "data-status", data: { state: "thinking" }, transient: true });

        const agentStream = await agent.stream(uiMessages, {
          modelSettings: { temperature, maxOutputTokens: maxTokens },
          abortSignal,
          requestContext,
        });

        let generating = false;
        let failed = false;
        let assistantMessageId: string = randomUUID();
        let assistantText = "";

        for await (const part of toAISdkStream(agentStream, { from: "agent", version: "v7" })) {
          if (clientSignal.aborted) break; // ninguém está ouvindo: para de processar

          // Erros reportados dentro do stream
          if (part.type === "error") {
            failed = true;
            writer.write({ type: "error", errorText: reportError(part.errorText) });
            continue;
          }

          if (part.type === "start" && part.messageId) assistantMessageId = part.messageId;

          if (part.type === "text-delta") {
            assistantText += part.delta;
            // STATUS_UPDATE: no primeiro token
            if (!generating) {
              generating = true;
              writer.write({ type: "data-status", data: { state: "generating" }, transient: true });
            }
          }

          // O adaptador v7 usa o mesmo protocolo, mas declara JSON de metadata como readonly.
          // O writer apenas encaminha o evento; não modifica esses objetos.
          writer.write(part as UIMessageChunk);
        }

        // Estourar o timeout pode encerrar o stream sem erro algum; nesse caso avisamos aqui
        if (!failed && timeoutSignal.aborted && !clientSignal.aborted) {
          failed = true;
          writer.write({ type: "error", errorText: reportError(timeoutSignal.reason) });
        }

        // Só resposta completa entra no histórico do servidor
        const completed = !failed && !clientSignal.aborted && assistantText.trim().length > 0;
        if (completed && options.onAssistantReply) {
          await options
            .onAssistantReply({
              id: assistantMessageId,
              role: "assistant",
              parts: [{ type: "text", text: assistantText }],
            })
            .catch(() => console.error("[chat] falha ao salvar a resposta no histórico."));
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
