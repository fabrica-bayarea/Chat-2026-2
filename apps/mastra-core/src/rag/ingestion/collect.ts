import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Source, SourceType } from "../sources.js";

export type CollectedSource = {
  source: Source;
  content: Buffer;
  collectedAt: string;
};

const DOCUMENT_TYPES: Record<string, SourceType> = {
  ".pdf": "pdf",
  ".docx": "docx",
  ".doc": "doc",
};

// Lista os documentos da pasta local; extensões não suportadas são ignoradas
export async function listDocumentSources(dir: string): Promise<Source[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });

  return entries
    .filter((entry) => entry.isFile())
    .flatMap((entry) => {
      const type = DOCUMENT_TYPES[path.extname(entry.name).toLowerCase()];
      if (!type) return [];

      const location = path.join(entry.parentPath, entry.name);
      return [
        {
          id: path.relative(dir, location).split(path.sep).join("/"),
          origin: "documento" as const,
          type,
          location,
        },
      ];
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function collectSource(
  source: Source,
  options: { timeoutMs: number },
): Promise<CollectedSource> {
  const content =
    source.origin === "site"
      ? await fetchPage(source.location, options.timeoutMs)
      : await readFile(source.location);

  return { source, content, collectedAt: new Date().toISOString() };
}

async function fetchPage(url: string, timeoutMs: number): Promise<Buffer> {
  const response = await fetch(url, {
    headers: { "User-Agent": "chat-2026-ingestao/1.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`${url} respondeu status ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
