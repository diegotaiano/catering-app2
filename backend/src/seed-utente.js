// Uso: node src/seed-utente.js "Nome" "Cognome" "email@esempio.it" "password123" [ruolo]
// ruoli disponibili: hr_manager (pieno accesso), amministrazione, commerciale (leggono tutto),
// referente_commerciale (solo i propri eventi), capo_servizio (solo eventi assegnati)
import bcrypt from 'bcryptjs';
import { pool, query } from './db.js';

const RUOLI_VALIDI = ['hr_manager', 'responsabile_servizio', 'amministrazione', 'commerciale', 'referente_commerciale', 'capo_servizio'];

const [nome, cognome, email, password, ruoloInput] = process.argv.slice(2);
const ruolo = ruoloInput || 'hr_manager';

if (!nome || !cognome || !email || !password) {
  console.error(`Uso: node src/seed-utente.js "Nome" "Cognome" "email@esempio.it" "password" [${RUOLI_VALIDI.join('|')}]`);
  process.exit(1);
}

if (!RUOLI_VALIDI.includes(ruolo)) {
  console.error(`Ruolo non valido. Usa uno tra: ${RUOLI_VALIDI.join(', ')}`);
  process.exit(1);
}

async function crea() {
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO utenti (nome, cognome, email, password_hash, ruolo)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, ruolo = EXCLUDED.ruolo
     RETURNING id, nome, cognome, email, ruolo`,
    [nome, cognome, email, hash, ruolo]
  );
  console.log('Utente creato/aggiornato:', rows[0]);
  await pool.end();
}

crea().catch(err => { console.error(err); process.exit(1); });
