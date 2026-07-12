import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { richiediAuth } from '../middleware/auth.js';
import { richiediRuolo } from '../middleware/ruoli.js';

const router = express.Router();
router.use(richiediAuth);
router.use(richiediRuolo(['responsabile_servizio'])); // tutta questa area è riservata

router.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT id, nome, cognome, email, ruolo, attivo, creato_il FROM utenti ORDER BY cognome, nome`
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { nome, cognome, email, password, ruolo } = req.body;
  if (!nome || !cognome || !email || !password) {
    return res.status(400).json({ errore: 'nome, cognome, email e password sono richiesti' });
  }
  if (!['responsabile_servizio', 'capisquadra'].includes(ruolo)) {
    return res.status(400).json({ errore: 'Ruolo non valido' });
  }

  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await query(
      `INSERT INTO utenti (nome, cognome, email, password_hash, ruolo)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, nome, cognome, email, ruolo, attivo`,
      [nome, cognome, email, hash, ruolo]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ errore: 'Esiste già un utente con questa email' });
    }
    throw err;
  }
});

// Cambia ruolo o stato attivo/disattivo (mai la propria disattivazione, per non chiudersi fuori)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { ruolo, attivo } = req.body;

  if (Number(id) === req.utente.id && attivo === false) {
    return res.status(400).json({ errore: 'Non puoi disattivare il tuo stesso account' });
  }
  if (ruolo && !['responsabile_servizio', 'capisquadra'].includes(ruolo)) {
    return res.status(400).json({ errore: 'Ruolo non valido' });
  }

  const campi = [];
  const valori = [];
  if (ruolo !== undefined) { campi.push(`ruolo = $${campi.length + 1}`); valori.push(ruolo); }
  if (attivo !== undefined) { campi.push(`attivo = $${campi.length + 1}`); valori.push(attivo); }
  if (campi.length === 0) return res.status(400).json({ errore: 'Nessun campo da aggiornare' });

  valori.push(id);
  const { rows } = await query(
    `UPDATE utenti SET ${campi.join(', ')} WHERE id = $${valori.length} RETURNING id, nome, cognome, email, ruolo, attivo`,
    valori
  );
  if (!rows[0]) return res.status(404).json({ errore: 'Utente non trovato' });
  res.json(rows[0]);
});

export default router;
