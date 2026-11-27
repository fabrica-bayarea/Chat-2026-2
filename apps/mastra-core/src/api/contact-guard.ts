import { findContacts, UNKNOWN_CONTACT } from "../rag/contacts.js";
import type { KnowledgeTopic } from "../rag/knowledge-context.js";
import { normalizeWord } from "../rag/retrieval/lexical.js";

// Segura o texto da resposta até o fim de cada linha (ou de uma frase, se a linha ficar longa)
// para conferir os contatos antes de mandar para a tela:
// - e-mail e telefone que não estão nos trechos da base nem nas mensagens do usuário saem;
// - contato que, na base, é de outro setor também sai: se a linha fala da ouvidoria e o
//   telefone só aparece no trecho da biblioteca, ele não é da ouvidoria;
// - a linha "Contatos deste trecho" é de uso interno do contexto e nunca vai para a tela.
// O modelo completa contatos que não existem, e um contato errado é a pior resposta do chat.

const MAX_BUFFER_CHARS = 300;
// Também quando o modelo cola a frase no fim de outra linha
const INTERNAL_LINE = /[ \t]*contatos (?:deste|neste) trecho\b[^\n]*/gi;
// O modelo também reescreve a frase ("Contatos deste setor: nenhum."). Sem contato ela não
// informa nada e sai; quando traz um contato, segue para a conferência normal
const EMPTY_CONTACT =
  /[ \t]*\bcontatos? (?:deste|neste|desse|nesse) (?:trecho|setor|assunto)(?: \([^)\n]*\))?[ \t]*:[ \t]*nenhum\b\.?/
    .source;
// Sozinha na linha, a linha inteira sai
const EMPTY_CONTACT_ALONE = new RegExp(`^${EMPTY_CONTACT}[ \\t]*(?:\\n|$)`, "gim");
const EMPTY_CONTACT_INLINE = new RegExp(EMPTY_CONTACT, "gi");

export type ContactGuard = {
  // Recebe um pedaço do texto e devolve o que já pode ir para a tela (pode ser vazio)
  push(id: string, delta: string): string;
  // Libera o que restou de um texto (fim da parte de texto)
  flush(id: string): string;
  // Libera tudo o que restou, de todos os textos (fim do stream sem text-end)
  flushAll(): Array<[id: string, text: string]>;
  // Quantos contatos foram trocados até agora
  readonly redacted: number;
};

export function createContactGuard(
  allowed: ReadonlySet<string>,
  topics: KnowledgeTopic[] = [],
): ContactGuard {
  const buffers = new Map<string, string>();
  let redacted = 0;

  // Contato permitido, mas de outro assunto que não o citado na linha
  function belongsElsewhere(key: string, line: string): boolean {
    const normalizedLine = normalizeWord(line);
    const mentioned = topics.filter((topic) =>
      topic.names.some((name) => normalizedLine.includes(name)),
    );
    if (mentioned.length === 0) return false;
    return !mentioned.some((topic) => topic.contacts.includes(key));
  }

  function release(text: string): string {
    const clean = text
      .replace(EMPTY_CONTACT_ALONE, "")
      .replace(EMPTY_CONTACT_INLINE, "")
      .replace(INTERNAL_LINE, "")
      .replace(/\n{3,}/g, "\n\n");
    let result = "";
    let cursor = 0;
    for (const contact of findContacts(clean)) {
      if (allowed.has(contact.key) && !belongsElsewhere(contact.key, clean)) continue;
      result += clean.slice(cursor, contact.index) + UNKNOWN_CONTACT;
      cursor = contact.index + contact.text.length;
      redacted++;
    }
    return result + clean.slice(cursor);
  }

  return {
    push(id, delta) {
      const buffer = (buffers.get(id) ?? "") + delta;
      let cut = buffer.lastIndexOf("\n") + 1;
      if (cut === 0 && buffer.length > MAX_BUFFER_CHARS) {
        const sentenceEnd = buffer.lastIndexOf(". ");
        cut = sentenceEnd >= 0 ? sentenceEnd + 2 : 0;
      }
      if (cut === 0) {
        buffers.set(id, buffer);
        return "";
      }
      buffers.set(id, buffer.slice(cut));
      return release(buffer.slice(0, cut));
    },

    flush(id) {
      const buffer = buffers.get(id) ?? "";
      buffers.delete(id);
      return buffer ? release(buffer) : "";
    },

    flushAll() {
      const rest: Array<[string, string]> = [];
      for (const id of [...buffers.keys()]) {
        const text = this.flush(id);
        if (text) rest.push([id, text]);
      }
      return rest;
    },

    get redacted() {
      return redacted;
    },
  };
}
