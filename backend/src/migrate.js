import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf-8');
  console.log('Applico schema.sql...');
  await pool.query(sql);
  console.log('Schema applicato con successo.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Errore migrazione:', err);
  process.exit(1);
});
