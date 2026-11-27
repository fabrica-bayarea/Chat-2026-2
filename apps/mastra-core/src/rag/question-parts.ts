// Divide uma mensagem grande nas perguntas que a busca precisa encontrar separadamente.
// Um único embedding da mensagem inteira mistura os assuntos e acaba trazendo trechos de
// um só deles; buscando cada pergunta, todas as partes chegam ao agente.

export type QuestionPartsOptions = {
  // Máximo de buscas por mensagem
  maxParts: number;
  // Tamanho máximo de cada consulta (RAG_QUERY_MAX_CHARS)
  maxChars: number;
};

// "como funciona a biblioteca e como falo com a ouvidoria?" vira duas perguntas
const QUESTION_WORDS =
  "como|onde|qual|quais|quando|quanto|quantos|quantas|quem|o que|por que|existe|existem|tem|há|posso|preciso|pode|podem";
const CONJUNCTION = new RegExp(`,?\\s+e\\s+(?=(?:${QUESTION_WORDS})\\b)`, "i");

// Parte que depende da anterior ("quanto custa?", "e no sábado?") não tem assunto suficiente
// e leva junto o texto anterior
const SHORT_PART_WORDS = 3;
const CONTINUATION_MAX_WORDS = 6;

export function splitQuestion(text: string, options: QuestionPartsOptions): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const sentences = clean.split(/(?<=[?!.])\s+/).filter(Boolean);
  const parts: string[] = [];

  sentences.forEach((sentence, index) => {
    if (!sentence.includes("?")) return;
    for (const piece of sentence.split(CONJUNCTION)) {
      const question = piece.trim();
      if (!question) continue;
      const previous = parts.at(-1) ?? sentences[index - 1];
      parts.push(isShort(question) && previous ? `${previous} ${question}` : question);
    }
  });

  // Sem pergunta explícita, a mensagem inteira é a consulta; o fim costuma ter o pedido
  if (parts.length === 0) return [clipKeepingEnd(clean, options.maxChars)];

  const unique = [...new Set(parts)].slice(0, options.maxParts);
  return unique.map((part) => clipKeepingEnd(part, options.maxChars));
}

function isShort(text: string): boolean {
  const words = text.split(" ").filter(Boolean).length;
  if (words <= SHORT_PART_WORDS) return true;
  return /^e\s/i.test(text) && words <= CONTINUATION_MAX_WORDS;
}

function clipKeepingEnd(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const tail = text.slice(-maxChars);
  const firstSpace = tail.indexOf(" ");
  return (firstSpace > 0 ? tail.slice(firstSpace + 1) : tail).trim();
}
