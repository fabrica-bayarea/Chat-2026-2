import { describe, expect, it } from "vitest";
import { buildContextWindow, type IncomingMessage } from "./context-window.js";

function text(role: IncomingMessage["role"], value: string, id?: string): IncomingMessage {
  return { ...(id ? { id } : {}), role, parts: [{ type: "text", text: value }] };
}

const config = { historySize: 10, maxChars: 6000 };

describe("buildContextWindow", () => {
  it("conversa curta passa inteira, na mesma ordem", () => {
    const messages = [text("user", "oi", "1"), text("assistant", "olá", "2"), text("user", "cursos?", "3")];

    expect(buildContextWindow(messages, config)).toEqual(messages);
  });

  it("guarda só as últimas historySize mensagens", () => {
    const messages = Array.from({ length: 30 }, (_, i) =>
      text(i % 2 === 0 ? "user" : "assistant", `m${i}`),
    );

    const window = buildContextWindow(messages, { ...config, historySize: 4 });

    expect(window.map((m) => m.parts[0]?.text)).toEqual(["m26", "m27", "m28", "m29"]);
  });

  it("tira as mais antigas até caber em maxChars", () => {
    const messages = [
      text("user", "a".repeat(3000)),
      text("assistant", "b".repeat(3000)),
      text("user", "c".repeat(3000)),
    ];

    const window = buildContextWindow(messages, { ...config, maxChars: 6000 });

    expect(window.map((m) => m.parts[0]?.text[0])).toEqual(["b", "c"]);
  });

  it("a pergunta atual sempre fica, mesmo maior que maxChars", () => {
    const messages = [text("user", "antiga"), text("user", "x".repeat(9000))];

    const window = buildContextWindow(messages, { ...config, maxChars: 100 });

    expect(window).toHaveLength(1);
    expect(window[0]?.parts[0]?.text).toHaveLength(9000);
  });

  it("anexo vira nota com o nome, sem o conteúdo em base64", () => {
    const messages: IncomingMessage[] = [
      {
        role: "user",
        parts: [
          { type: "text", text: "veja o edital" },
          { type: "file", filename: "edital.pdf", url: "data:application/pdf;base64,AAAA" } as never,
        ],
      },
    ];

    const [message] = buildContextWindow(messages, config);

    expect(message?.parts).toEqual([
      { type: "text", text: "veja o edital" },
      { type: "text", text: "[anexo não lido pelo assistente: edital.pdf]" },
    ]);
    expect(JSON.stringify(message)).not.toContain("base64");
  });

  it("tira partes sem conteúdo (step-start) e mensagens que ficam vazias", () => {
    const messages: IncomingMessage[] = [
      text("user", "oi"),
      { role: "assistant", parts: [{ type: "step-start" }] },
      { role: "assistant", parts: [{ type: "step-start" }, { type: "text", text: "olá" }] },
    ];

    const window = buildContextWindow(messages, config);

    expect(window).toEqual([text("user", "oi"), text("assistant", "olá")]);
  });
});
