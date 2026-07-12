// Uso: node src/seed-utente.js "Nome" "Cognome" "email@esempio.it" "password123"
import bcrypt from 'bcryptjs';
import { pool, query } from './db.js';

const [nome, cognome, email, password] = process.argv.slice(2);

if (!nome || !cognome || !email || !password) {
  console.error('Uso: node src/seed-utente.js "Nome" "Cognome" "email@esempio.it" "password"');
  process.exit(1);
}

async function crea() {
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO utenti (nome, cognome, email, password_hash, ruolo)
     VALUES ($1,$2,$3,$4,'responsabile_servizio')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id, nome, cognome, email`,
    [nome, cognome, email, hash]
  );
  console.log('Utente creato/aggiornato:', rows[0]);
  await pool.end();
}

crea().catch(err => { console.error(err); process.exit(1); });
