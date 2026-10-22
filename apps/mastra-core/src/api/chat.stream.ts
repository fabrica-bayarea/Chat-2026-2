import { randomUUID } from "node:crypto";
import { toAISdkStream } from "@mastra/ai-sdk";
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { loadLlmConfig } from "../config/llm.config.js";
import { mastra } from "../mastra.config.js";
import { classifyStreamError, STREAM_ERROR_MESSAGES } from "./error.js";

type IncomingMessage = {
  id?: string;
  role: "user" | "assistant";
  parts: Array<{ type: string }>;
};

export function createChatResponse(
  messages: IncomingMessage[],
  clientSignal: AbortSignal,
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

  // O useChat sempre envia id, mas o schema o aceita como opcional; garantimos um aqui
  const uiMessages = messages.map((message) => ({
    ...message,
    id: message.id ?? randomUUID(),
  })) as UIMessage[];

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

        const agentStream = await agent.stream(uiMessages, {
          modelSettings: { temperature, maxOutputTokens: maxTokens },
          abortSignal,
        });

        let generating = false;
        let failed = false;

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

          writer.write(part); // TEXT_CHUNK (text-delta), start, text-start, text-end, finish...
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