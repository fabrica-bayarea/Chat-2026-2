import { describe, expect, it } from "vitest";
import { buildSiteLinks, SITE_LINKS_TITLE, stripSiteLinks } from "./site-links.js";

const source = (page: string) => ({
  label: `${page} — iesb.br`,
  origin: "site" as const,
  url: `https://www.iesb.br/${page}/`,
});

describe("buildSiteLinks", () => {
  it("resposta com base: lista até três páginas usadas, sem Fale Conosco", () => {
    const block = buildSiteLinks({
      answer: "A biblioteca abre às 7h45.",
      sources: ["a", "b", "c", "d"].map(source),
    });
    expect(block).toContain(SITE_LINKS_TITLE);
    expect(block).toContain("- https://www.iesb.br/a/\n");
    expect(block).not.toContain("/d/");
    expect(block).not.toContain("fale-conosco");
  });

  it("na dúvida sem fonte: site oficial e Fale Conosco", () => {
    const block = buildSiteLinks({ answer: "Não tenho informações sobre esse valor.", sources: [] });
    expect(block).toContain("- https://www.iesb.br/\n");
    expect(block).toContain("- https://www.iesb.br/fale-conosco/");
  });

  it("na dúvida com fonte: páginas usadas e também os canais do site", () => {
    const block = buildSiteLinks({
      answer: "Sugiro consultar os canais oficiais.",
      sources: [source("transferencia")],
    });
    expect(block).toContain("/transferencia/");
    expect(block).toContain("fale-conosco");
  });

  it("cumprimento, recusa fora do assunto e resposta vazia ficam sem links", () => {
    const base = { sources: [] };
    expect(buildSiteLinks({ ...base, answer: "Olá! Como posso ajudar?" })).toBe("");
    expect(buildSiteLinks({ ...base, answer: "Desculpe, não posso resolver essa integral." })).toBe("");
    expect(buildSiteLinks({ ...base, answer: "  " })).toBe("");
  });
});

describe("stripSiteLinks", () => {
  it("tira o bloco das respostas antigas e mantém as mensagens do usuário", () => {
    const text = `Resposta.\n\n${SITE_LINKS_TITLE}\n- [a](https://www.iesb.br/a/)`;
    const [assistant, user] = stripSiteLinks([
      { role: "assistant", parts: [{ type: "text", text }] },
      { role: "user", parts: [{ type: "text", text }] },
    ]);
    expect(assistant!.parts[0]!.text).toBe("Resposta.");
    expect(user!.parts[0]!.text).toBe(text);
  });
});
