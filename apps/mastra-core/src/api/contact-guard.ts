import { redactUnknownContacts } from "../rag/contacts.js";

// Segura o texto da resposta até o fim de cada linha (ou de uma frase, se a linha ficar longa)
// para conferir os contatos antes de mandar para a tela. E-mail e telefone que não estão nos
// trechos da base nem nas mensagens do usuário são trocados: o modelo completa contatos que
// não existem ("ouvidoria@..."), e um contato errado é a pior resposta que o chat pode dar.

const MAX_BUFFER_CHARS = 300;

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

export function createContactGuard(allowed: ReadonlySet<string>): ContactGuard {
  const buffers = new Map<string, string>();
  let redacted = 0;

  function release(text: string): string {
    const result = redactUnknownContacts(text, allowed);
    redacted += result.redacted;
    return result.text;
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
