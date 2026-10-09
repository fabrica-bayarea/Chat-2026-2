import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { buildChatBodySchema } from "./api/chat.schema.js";
import { createChatResponse } from "./api/chat.stream.js";
import { invalidRequest } from "./api/error.js";
import { loadServerConfig } from "./config/server.config.js";

const config = loadServerConfig();
const chatBodySchema = buildChatBodySchema(config);

const app = new Hono();

// CORS vem primeiro para que as respostas de erro (400) também levem os headers CORS
app.use(
  "/api/*",
  cors({
    origin: config.corsOrigins.includes("*") ? "*" : config.corsOrigins,
    allowMethods: ["POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
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

    return createChatResponse(parsed.data.messages, c.req.raw.signal);
});

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`Servidor ouvindo em http://localhost:${info.port}`);
});