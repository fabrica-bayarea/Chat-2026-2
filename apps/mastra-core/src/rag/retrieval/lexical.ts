// Reforço por palavras-chave na ordem dos trechos. A busca semântica sozinha confunde nomes
// próprios: para "critérios da Bolsa Excelência", o texto genérico de bolsas fica na frente do
// trecho da própria Bolsa Excelência. Palavra rara entre os candidatos ("excelência") pesa mais
// que palavra comum ("bolsa").

const STOPWORDS = new Set([
  "qual", "quais", "como", "onde", "quando", "quanto", "quanta", "quantos", "quantas", "porque",
  "para", "pelo", "pela", "pelos", "pelas", "sobre", "entre", "depois", "antes", "esse", "essa",
  "este", "esta", "isso", "isto", "aqui", "voce", "voces", "minha", "meus", "minhas", "seus",
  "suas", "tenho", "existe", "existem", "fazer", "faco", "funciona", "funcionam", "saber",
  "gostaria", "queria", "quero", "preciso", "posso", "pode", "podem", "estao", "iesb",
  "faculdade", "instituicao", "centro", "universitario", "algum", "alguma", "alguns", "algumas",
  "mais", "menos", "muito", "muita", "tambem", "ainda", "mesmo", "outra", "outro", "tudo",
  "todos", "todas", "completo", "completa", "informacao", "informacoes",
]);

// O site raramente usa a palavra da pergunta para dados de contato e localização
const SYNONYMS: Record<string, string[]> = {
  endereco: ["endereco", "localizacao", "cep", "quadra", "lotes"],
  fica: ["fica", "localizacao", "cep", "quadra", "lotes"],
  localizacao: ["localizacao", "endereco", "cep", "quadra"],
  horario: ["horario", "funcionamento"],
  horarios: ["horario", "funcionamento"],
  funcionamento: ["funcionamento", "horario"],
  telefone: ["telefone", "contato", "whatsapp"],
  contato: ["contato", "telefone", "whatsapp", "e-mail", "email"],
  email: ["e-mail", "email", "contato"],
};

export function normalizeWord(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

// Palavras-chave da pergunta, cada uma com as formas que contam como presentes no trecho
export function queryKeywords(query: string): string[][] {
  const words = normalizeWord(query).match(/[\p{L}\p{N}]+/gu) ?? [];
  const unique = [...new Set(words.filter((word) => word.length >= 4 && !STOPWORDS.has(word)))];
  return unique.map((word) => SYNONYMS[word] ?? [word]);
}

// Para cada texto, a proporção (0 a 1) das palavras-chave da pergunta presentes nele, com
// peso maior para as que aparecem em poucos textos
export function keywordScores(query: string, texts: string[]): number[] {
  const keywords = queryKeywords(query);
  const normalized = texts.map(normalizeWord);
  const has = (text: string, forms: string[]) => forms.some((form) => text.includes(form));

  const rarity: Array<[string[], number]> = [];
  for (const forms of keywords) {
    const count = normalized.filter((text) => has(text, forms)).length;
    if (count > 0) rarity.push([forms, Math.log(1 + texts.length / count)]);
  }
  const total = rarity.reduce((sum, [, value]) => sum + value, 0);
  if (total === 0) return texts.map(() => 0);

  return normalized.map((text) => {
    let matched = 0;
    for (const [forms, value] of rarity) if (has(text, forms)) matched += value;
    return matched / total;
  });
}
