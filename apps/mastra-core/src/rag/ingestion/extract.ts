import path from "node:path";
import * as cheerio from "cheerio";
import { extractText as extractPdfText, getDocumentProxy, getMeta } from "unpdf";
import WordExtractor from "word-extractor";
import type { CollectedSource } from "./collect.js";

export type ExtractedPart = {
  text: string;
  // Página de origem (apenas PDF)
  page?: number;
  // Título da seção da página (apenas HTML): cada trecho começa com ele
  section?: string;
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
    case "docx":
    case "doc":
      return extractWord(collected);
  }
}

// Elementos que se repetem em todas as páginas e não fazem parte do conteúdo
const HTML_NOISE = "script, style, noscript, svg, iframe, form, header, nav, footer";

function extractHtml(collected: CollectedSource): ExtractedDocument {
  const $ = cheerio.load(collected.content.toString("utf-8"));

  // O <title> do site vem como "Página | IESB | Centro Universitário"
  const title = $("title").first().text().split("|")[0]?.trim() || collected.source.id;

  $(HTML_NOISE).remove();
  // Cada título (h1 a h3) abre uma seção. Sem isso, um trecho junta o fim de uma seção com o
  // começo da outra e o agente atribui o prazo de uma bolsa a outra
  $("h1, h2, h3").before(SECTION_MARK);
  // Quebra de linha entre blocos para o texto não sair todo grudado
  $("p, li, h1, h2, h3, h4, h5, h6, div, section, br, tr").after("\n");

  return { collected, title, parts: splitSections($("body").text()) };
}

const SECTION_MARK = "\u0001secao\u0001";

function splitSections(text: string): ExtractedPart[] {
  const parts: ExtractedPart[] = [];
  text.split(SECTION_MARK).forEach((segment, index) => {
    // Antes do primeiro título não há seção
    if (index === 0) {
      if (segment.trim()) parts.push({ text: segment });
      return;
    }
    const lines = segment.split("\n");
    const headingIndex = lines.findIndex((line) => line.trim());
    if (headingIndex < 0) return;
    const section = lines[headingIndex]!.replace(/\s+/g, " ").trim();
    const body = lines.slice(headingIndex + 1).join("\n").trim();
    // Título sem conteúdo (ex.: "DESCONTOS" logo antes das subseções) não vira trecho
    if (!body) return;
    parts.push({ text: segment, section });
  });
  return parts;
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

// O word-extractor lê tanto o .docx quanto o .doc (formato binário antigo do Word).
// O mammoth foi descartado porque depende do jszip, licenciado como "MIT OR GPL-3.0",
// o que reprova o Dependency Review do pipeline de segurança
async function extractWord(collected: CollectedSource): Promise<ExtractedDocument> {
  const doc = await new WordExtractor().extract(collected.content);
  return {
    collected,
    title: fileTitle(collected.source.location),
    parts: [{ text: doc.getBody() }],
  };
}

function fileTitle(location: string): string {
  return path.basename(location, path.extname(location)).replace(/[-_]+/g, " ").trim();
}
