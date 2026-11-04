export type SourceType = "html" | "pdf" | "docx" | "doc";

export type SourceOrigin = "site" | "documento";

export type Source = {
  id: string;
  origin: SourceOrigin;
  type: SourceType;
  // URL da página ou caminho do arquivo local
  location: string;
};

// Páginas públicas do site institucional usadas na primeira ingestão.
// Para incluir uma nova página, basta adicionar a URL aqui.
const SITE_PAGES = [
  "https://www.iesb.br/o-iesb/",
  "https://www.iesb.br/guia-do-estudante-iesb/",
  "https://www.iesb.br/processo-seletivo/",
  "https://www.iesb.br/transferencia/",
  "https://www.iesb.br/processo-seletivo/pos-e-mestrado/",
  "https://www.iesb.br/processo-seletivo/fies-prouni-pravaler/",
  "https://www.iesb.br/bolsas-e-descontos/",
  "https://www.iesb.br/aproveitamento-de-disciplinas/",
  "https://www.iesb.br/colacao-de-grau/",
  "https://www.iesb.br/biblioteca/",
  "https://www.iesb.br/estrutura/",
  "https://www.iesb.br/estrutura/campus-sul/",
  "https://www.iesb.br/estrutura/campus-ceilandia/",
  "https://www.iesb.br/extensao-curricular/",
  "https://www.iesb.br/enade/",
  "https://www.iesb.br/cpa/",
  "https://www.iesb.br/ouvidoria-2/",
  "https://www.iesb.br/fale-conosco/",
];

export const siteSources: Source[] = SITE_PAGES.map((url) => ({
  id: url,
  origin: "site",
  type: "html",
  location: url,
}));
