// Uso: node src/seed-utente.js "Nome" "Cognome" "email@esempio.it" "password123" [ruolo]
// ruolo: responsabile_servizio (default, puo' creare/modificare eventi) oppure capisquadra (sola lettura)
import bcrypt from 'bcryptjs';
import { pool, query } from './db.js';

const [nome, cognome, email, password, ruoloInput] = process.argv.slice(2);
const ruolo = ruoloInput || 'responsabile_servizio';

if (!nome || !cognome || !email || !password) {
  console.error('Uso: node src/seed-utente.js "Nome" "Cognome" "email@esempio.it" "password" [responsabile_servizio|capisquadra]');
  process.exit(1);
}

if (!['responsabile_servizio', 'capisquadra'].includes(ruolo)) {
  console.error('Ruolo non valido. Usa "responsabile_servizio" oppure "capisquadra".');
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
