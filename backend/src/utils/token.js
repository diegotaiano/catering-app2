import crypto from 'crypto';

// Genera un token sicuro per il magic-link di risposta disponibilità
export function generaTokenRisposta() {
  return crypto.randomBytes(24).toString('hex'); // 48 caratteri
}

// Scadenza di default: 10 giorni da ora (adeguato ai tempi di organizzazione eventi)
export function scadenzaDefault() {
  const d = new Date();
  d.setDate(d.getDate() + 10);
  return d;
}
