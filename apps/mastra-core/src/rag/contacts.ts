// E-mails e telefones citados em um texto. Contato é o dado que o modelo mais inventa
// ("ouvidoria@..."), então a resposta só pode trazer os que aparecem nos trechos da base.

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
// (61) 3962-4816, (61) 9 9332-7259, 61 3962 4816, 0800 123 4567
const PHONE = /(?:\(?\b\d{2}\)?[\s.-]?)?(?:\b9[\s.-]?)?\b\d{4}[\s.-]?\d{4}\b|\b0800[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

export type ContactMatch = { text: string; key: string; index: number };

function phoneKey(text: string): string {
  // Os 8 últimos dígitos identificam o número com ou sem DDD e o 9 da frente
  return `tel:${text.replace(/\D/g, "").slice(-8)}`;
}

function emailKey(text: string): string {
  return `email:${text.toLowerCase().replace(/\.+$/, "")}`;
}

export function findContacts(text: string): ContactMatch[] {
  const found: ContactMatch[] = [];
  for (const match of text.matchAll(EMAIL)) {
    const value = match[0].replace(/\.+$/, "");
    found.push({ text: value, key: emailKey(value), index: match.index! });
  }
  for (const match of text.matchAll(PHONE)) {
    const inEmail = found.some(
      (email) => match.index! >= email.index && match.index! < email.index + email.text.length,
    );
    if (!inEmail) found.push({ text: match[0], key: phoneKey(match[0]), index: match.index! });
  }
  return found.sort((a, b) => a.index - b.index);
}

// Chaves normalizadas dos contatos de um texto, para comparar com a resposta
export function contactKeys(text: string): string[] {
  return [...new Set(findContacts(text).map((contact) => contact.key))];
}

export const UNKNOWN_CONTACT = "[contato não informado na base]";

// Troca na resposta os contatos que não estão entre os permitidos. Devolve o texto e
// quantos contatos foram trocados
export function redactUnknownContacts(
  text: string,
  allowed: ReadonlySet<string>,
): { text: string; redacted: number } {
  let redacted = 0;
  let result = "";
  let cursor = 0;
  for (const contact of findContacts(text)) {
    if (allowed.has(contact.key)) continue;
    result += text.slice(cursor, contact.index) + UNKNOWN_CONTACT;
    cursor = contact.index + contact.text.length;
    redacted++;
  }
  return { text: result + text.slice(cursor), redacted };
}
