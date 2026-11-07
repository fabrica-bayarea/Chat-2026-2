import { describe, expect, it } from "vitest";
import { toCitation, uniqueCitations } from "./citation.js";

describe("toCitation", () => {
  it("cita página do site com o link", () => {
    expect(
      toCitation({
        sourceId: "https://www.iesb.br/biblioteca/",
        origin: "site",
        title: "Biblioteca",
      }),
    ).toEqual({
      label: "Biblioteca — iesb.br",
      origin: "site",
      url: "https://www.iesb.br/biblioteca/",
    });
  });

  it("cita documento com o arquivo e a página", () => {
    expect(
      toCitation({ sourceId: "editais/edital.pdf", origin: "documento", title: "Edital", page: 3 }),
    ).toEqual({
      label: "Edital (editais/edital.pdf), p. 3",
      origin: "documento",
      document: "editais/edital.pdf",
      page: 3,
    });
  });

  it("não inventa página quando o documento não tem", () => {
    const citation = toCitation({ sourceId: "aviso.docx", origin: "documento", title: "Aviso" });

    expect(citation.label).toBe("Aviso (aviso.docx)");
    expect(citation).not.toHaveProperty("page");
  });
});

describe("uniqueCitations", () => {
  it("mantém uma citação por página, na ordem original", () => {
    const p1 = toCitation({ sourceId: "a.pdf", origin: "documento", title: "A", page: 1 });
    const p2 = toCitation({ sourceId: "a.pdf", origin: "documento", title: "A", page: 2 });
    const site = toCitation({ sourceId: "https://www.iesb.br/x/", origin: "site", title: "X" });

    expect(uniqueCitations([p2, site, p2, p1, site])).toEqual([p2, site, p1]);
  });
});
