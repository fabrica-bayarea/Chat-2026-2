import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// Senha guardada como "scrypt$<sal em hex>$<hash em hex>". Nunca a senha em texto.
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algorithm, saltHex, hashHex] = stored.split('$');
  if (algorithm !== 'scrypt' || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  // Comparação em tempo constante: não deixa descobrir a senha pelo tempo de resposta
  return timingSafeEqual(actual, expected);
}
