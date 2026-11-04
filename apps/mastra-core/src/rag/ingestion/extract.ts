import path from "node:path";
import * as cheerio from "cheerio";
import { extractText as extractPdfText, getDocumentProxy, getMeta } from "unpdf";
import type { CollectedSource } from "./collect.js";

export type ExtractedPart = {
  text: string;
  // Página de origem (apenas PDF)
  page?: number;
};

export type ExtractedDocument = {
  collected: CollectedSource;
  title: string;
  parts: ExtractedPart[];
};

export async function extractText(collected: CollectedSource): Promise<ExtractedDocument> {
  switch (collected.source.type) {
    case "html":
      return extractHtml(collected);
    case "pdf":
      return extractPdf(collected);
    default:
      throw new Error(`Tipo de fonte ainda não suportado: ${collected.source.type}`);
  }
}

// Elementos que se repetem em todas as páginas e não fazem parte do conteúdo
const HTML_NOISE = "script, style, noscript, svg, iframe, form, header, nav, footer";

function extractHtml(collected: CollectedSource): ExtractedDocument {
  const $ = cheerio.load(collected.content.toString("utf-8"));

  // O <title> do site vem como "Página | IESB | Centro Universitário"
  const title = $("title").first().text().split("|")[0]?.trim() || collected.source.id;

  $(HTML_NOISE).remove();
  // Quebra de linha entre blocos para o texto não sair todo grudado
  $("p, li, h1, h2, h3, h4, h5, h6, div, section, br, tr").after("\n");

  return { collected, title, parts: [{ text: $("body").text() }] };
}

async function extractPdf(collected: CollectedSource): Promise<ExtractedDocument> {
  // verbosity 0: o pdf.js loga avisos de fonte que não afetam o texto extraído
  const pdf = await getDocumentProxy(new Uint8Array(collected.content), { verbosity: 0 });
  const [{ text }, { info }] = await Promise.all([
    extractPdfText(pdf, { mergePages: false }),
    getMeta(pdf),
  ]);

  // O título dos metadados costuma vir vazio ou com o nome do modelo do Word
  // (ex.: "papel_timbrado"); só usamos quando parece um título de verdade
  const metaTitle = typeof info.Title === "string" ? info.Title.trim() : "";
  const title = /\s/.test(metaTitle) ? metaTitle : fileTitle(collected.source.location);

  return {
    collected,
    title,
    parts: text.map((pageText, index) => ({ text: pageText, page: index + 1 })),
  };
}

function fileTitle(location: string): string {
  return path.basename(location, path.extname(location)).replace(/[-_]+/g, " ").trim();
}
