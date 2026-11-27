import { describe, expect, it } from "vitest";
import { contactKeys, findContacts, redactUnknownContacts, UNKNOWN_CONTACT } from "./contacts.js";

describe("findContacts", () => {
  it("encontra e-mails e telefones em formatos comuns", () => {
    const text =
      "Contato: (61) 3962-4816 | WhatsApp: (61) 9 9332-7259 | E-mail: alanna.torres@iesb.br. Ou 0800 123 4567.";
    expect(findContacts(text).map((contact) => contact.text)).toEqual([
      "(61) 3962-4816",
      "(61) 9 9332-7259",
      "alanna.torres@iesb.br",
      "0800 123 4567",
    ]);
  });

  it("não confunde CEP, ano, nota ou matrícula com telefone", () => {
    const text = "CEP: 70.200-730. Inscrições até 2026, nota 650, matrícula 2023001, 1.250 caracteres.";
    expect(findContacts(text)).toEqual([]);
  });
});

describe("contactKeys", () => {
  it("reconhece o mesmo telefone com ou sem DDD e o mesmo e-mail em outra caixa", () => {
    expect(contactKeys("(61) 3962-4816")).toEqual(contactKeys("3962 4816"));
    expect(contactKeys("Ingresso@IESB.octadesk.com")).toEqual(contactKeys("ingresso@iesb.octadesk.com"));
  });
});

describe("redactUnknownContacts", () => {
  const allowed = new Set(contactKeys("Biblioteca: (61) 3962-4816, alanna.torres@iesb.br"));

  it("mantém os contatos que estão nos trechos", () => {
    const answer = "Ligue para (61) 3962-4816 ou escreva para alanna.torres@iesb.br.";
    expect(redactUnknownContacts(answer, allowed)).toEqual({ text: answer, redacted: 0 });
  });

  it("troca contatos que não estão nos trechos", () => {
    const result = redactUnknownContacts(
      "Fale com a ouvidoria pelo e-mail ouvidoria@iesb.br ou pelo (61) 3333-0000.",
      allowed,
    );
    expect(result.redacted).toBe(2);
    expect(result.text).toBe(
      `Fale com a ouvidoria pelo e-mail ${UNKNOWN_CONTACT} ou pelo ${UNKNOWN_CONTACT}.`,
    );
  });

  it("sem trechos da base, qualquer contato é trocado", () => {
    expect(redactUnknownContacts("Ligue 3962-4816.", new Set()).redacted).toBe(1);
  });
});
