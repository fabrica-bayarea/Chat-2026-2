import type { ExtractedDocument } from "./extract.js";

export function normalizeText(text: string): string {
  return (
    text
      .normalize("NFC")
      .replace(/\r\n?/g, "\n")
      .replace(/ /g, " ")
      // Hífen invisível, caracteres de largura zero e BOM
      .replace(/[­​-‍⁠﻿]/g, "")
      // Demais caracteres de controle, exceto quebra de linha e tab
      .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
      // Pontilhado de sumário: "APRESENTAÇÃO ........ 3"
      .replace(/\.{4,}/g, " ")
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      // Número de página solto (PDF) e trilha "Home > Página" do site
      .filter((line) => !/^\d{1,3}$/.test(line) && !/^Home\s*>/.test(line))
      .join("\n")
      // Palavra quebrada com hífen no fim da linha (PDF): "institu-\ncional"
      .replace(/(\p{Ll})-\n(\p{Ll})/gu, "$1$2")
      // Linha quebrada no meio da frase (PDF): junta quando a próxima começa minúscula
      .replace(/([^\n.!?:;])\n(?=\p{Ll})/gu, "$1 ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

// Partes que ficam vazias depois da limpeza (ex.: página só com imagem) são descartadas
export function normalizeDocument(doc: ExtractedDocument): ExtractedDocument {
  return {
    ...doc,
    title: normalizeText(doc.title).replace(/\s+/g, " "),
    parts: doc.parts
      .map((part) => ({ ...part, text: normalizeText(part.text) }))
      .filter((part) => part.text.length > 0),
  };
}
