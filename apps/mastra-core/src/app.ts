import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { buildChatBodySchema } from "./api/chat.schema.js";
import { createChatResponse } from "./api/chat.stream.js";
import { forbidden, internalError, invalidRequest } from "./api/error.js";
import { findLoggedStudent } from "./auth/logged-student.js";
import { loadAuthConfig } from "./config/auth.config.js";
import { loadServerConfig } from "./config/server.config.js";
import { loadStorageConfig } from "./config/storage.config.js";
import {
  buildTrustedConversation,
  ConversationAccessError,
  createLibSQLChatHistory,
  studentOwner,
  VISITOR_OWNER,
  type ChatHistoryStore,
} from "./context/chat-history.js";

// Histórico do servidor, aberto uma vez só (na primeira mensagem)
let chatHistory: Promise<ChatHistoryStore> | undefined;

function getChatHistory(maxMessages: number): Promise<ChatHistoryStore> {
  chatHistory ??= createLibSQLChatHistory(loadStorageConfig().chatHistoryDbUrl, maxMessages).catch(
    (error: unknown) => {
      chatHistory = undefined; // próxima mensagem tenta de novo
      throw error;
    },
  );
  return chatHistory;
}

export function createApp() {
  const config = loadServerConfig();
  const authConfig = loadAuthConfig();
  const chatBodySchema = buildChatBodySchema(config);

  const app = new Hono();

  // CORS vem primeiro para que as respostas de erro (400) também levem os headers CORS.
  // Com origem explícita, o navegador manda o cookie da sessão (credentials).
  const anyOrigin = config.corsOrigins.includes("*");
  app.use(
    "/api/*",
    cors({
      origin: anyOrigin ? "*" : config.corsOrigins,
      allowMethods: ["POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
      credentials: !anyOrigin,
    }),
  );

  // A issue pede 400 (e não 413) para corpo acima do limite
  app.use(
    "/api/chat",
    bodyLimit({
      maxSize: config.maxBodyBytes,
      onError: (c) => invalidRequest(c, "O corpo da requisição excede o tamanho máximo permitido."),
    }),
  );

  app.post("/api/chat", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return invalidRequest(c, "O corpo da requisição não é um JSON válido.");
    }

    const parsed = chatBodySchema.safeParse(body);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path.join(".") || "corpo";
      return invalidRequest(c, `Corpo da requisição inválido (campo: ${field}).`);
    }
    const { id: chatId, trigger, messages } = parsed.data;

    // Quem está conversando: o backend confere o cookie. Sem sessão válida = visitante.
    const student = await findLoggedStudent(c.req.header("cookie"), authConfig);
    const owner = student ? studentOwner(student.matricula) : VISITOR_OWNER;

    let store: ChatHistoryStore;
    let conversation;
    try {
      store = await getChatHistory(config.maxMessages);
      conversation = buildTrustedConversation({
        stored: await store.load(chatId),
        owner,
        trigger,
        incoming: messages,
        newMessageId: crypto.randomUUID(),
      });
      // A pergunta fica guardada antes da resposta: se a geração falhar, "regenerar" funciona
      await store.save(chatId, conversation);
    } catch (error) {
      if (error instanceof ConversationAccessError) {
        return error.kind === "forbidden"
          ? forbidden(c, error.message)
          : invalidRequest(c, error.message);
      }
      console.error("[chat] falha ao acessar o histórico do servidor.");
      return internalError(c);
    }

    return createChatResponse(conversation.messages, c.req.raw.signal, {
      student,
      onAssistantReply: (reply) =>
        store.save(chatId, { owner, messages: [...conversation.messages, reply] }),
    });
  });

  return app;
}
