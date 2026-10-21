import { z } from "zod";
import type { ServerConfig } from "../config/server.config.js";

export function buildChatBodySchema(
  config: Pick<ServerConfig, "maxMessages" | "maxMessageChars">,
) {
  // O useChat reenvia mensagens do assistente com partes que não são texto
  // (ex.: "step-start"). Por isso aceitamos qualquer tipo de parte e
  // validamos só as de texto; senão a segunda mensagem da conversa daria 400.
  const partSchema = z.looseObject({ type: z.string() });

  const messageSchema = z
    .object({
      id: z.string().optional(),
      role: z.enum(["user", "assistant"]),
      parts: z.array(partSchema).min(1),
    })
    .superRefine((message, ctx) => {
      let chars = 0;
      for (const part of message.parts) {
        if (part.type !== "text") continue;
        if (typeof part.text !== "string") {
          ctx.addIssue({ code: "custom", path: ["parts"], message: "parte de texto sem o campo text" });
          return;
        }
        chars += part.text.length;
      }
      if (chars > config.maxMessageChars) {
        ctx.addIssue({ code: "custom", path: ["parts"], message: "mensagem acima do limite de caracteres" });
      }
    });

  return z.object({
    id: z.string().optional(),
    trigger: z.string().optional(),
    messages: z.array(messageSchema).min(1).max(config.maxMessages),
  });
}