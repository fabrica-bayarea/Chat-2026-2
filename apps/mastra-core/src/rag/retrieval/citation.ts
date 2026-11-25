import type { RetrievedSource } from "./retrieve.js";

export type Citation = {
  // Texto pronto para citar a fonte na resposta
  label: string;
  origin: "site" | "documento";
  // Link da página (apenas fontes do site)
  url?: string;
  // Arquivo de origem relativo à pasta de documentos (apenas documentos)
  document?: string;
  page?: number;
};

export function toCitation(
  source: Pick<RetrievedSource, "sourceId" | "origin" | "title" | "page">,
): Citation {
  if (source.origin === "site") {
    return { label: `${source.title} — iesb.br`, origin: "site", url: source.sourceId };
  }

  const page = source.page !== undefined ? `, p. ${source.page}` : "";
  return {
    label: `${source.title} (${source.sourceId})${page}`,
    origin: "documento",
    document: source.sourceId,
    ...(source.page !== undefined ? { page: source.page } : {}),
  };
}

// Uma citação por página/documento, na ordem do trecho mais relevante
export function uniqueCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  return citations.filter((citation) => {
    const key = `${citation.url ?? citation.document}#${citation.page ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
