import type { IncomingMessage } from "../context/context-window.js";
import type { Citation } from "../rag/retrieval/citation.js";

// Bloco de links no fim da resposta, para a pessoa conferir ou procurar no site. É montado pelo
// servidor com as fontes da busca: o modelo esquece de citar e pode escrever endereço que não existe

export const SITE_LINKS_TITLE = "**Para conferir no site do IESB:**";
const SITE_URL = "https://www.iesb.br/";
const CONTACT_URL = "https://www.iesb.br/fale-conosco/";
const MAX_SOURCE_LINKS = 3;

// Sinais de que a resposta não resolveu a dúvida
const DOUBT =
  /não (?:tenho|encontrei|encontramos|traz|há|foi (?:fornecid|encontrad)|foram (?:fornecid|encontrad)|menciona|disponho|possuo)|não (?:está|estão) disponíve|canais oficiais|site oficial|contato não informado/i;
// Recusa de pedido fora do assunto (exercício, piada): não há o que procurar no site
const OUT_OF_SCOPE = /não posso (?:ajudar|resolver)|fora do (?:meu )?(?:domínio|escopo)/i;

export function buildSiteLinks(input: { answer: string; sources: Citation[] }): string {
  const { answer, sources } = input;
  if (!answer.trim()) return "";

  const refused = OUT_OF_SCOPE.test(answer);
  const doubt = !refused && DOUBT.test(answer);
  if (refused) return "";

  const lines: string[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    if (!source.url || seen.has(source.url) || seen.size === MAX_SOURCE_LINKS) continue;
    seen.add(source.url);
    lines.push(`- ${source.url}`);
  }

  // A busca do próprio site volta vazia para muitos termos, então na dúvida o caminho é a
  // página inicial e o Fale Conosco, que sempre abrem
  if (doubt) {
    if (!seen.has(SITE_URL)) lines.push(`- ${SITE_URL}`);
    if (!seen.has(CONTACT_URL)) lines.push(`- ${CONTACT_URL}`);
  }

  return lines.length ? `\n\n${SITE_LINKS_TITLE}\n${lines.join("\n")}` : "";
}

// O bloco é para a pessoa; no histórico enviado ao modelo ele sai, senão o modelo o imita
export function stripSiteLinks(messages: IncomingMessage[]): IncomingMessage[] {
  return messages.map((message) => {
    if (message.role !== "assistant") return message;
    return {
      ...message,
      parts: message.parts.map((part) => {
        if (part.type !== "text" || typeof part.text !== "string") return part;
        const start = part.text.indexOf(SITE_LINKS_TITLE);
        return start < 0 ? part : { ...part, text: part.text.slice(0, start).trimEnd() };
      }),
    };
  });
}
