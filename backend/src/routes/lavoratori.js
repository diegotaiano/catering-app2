import express from 'express';
import { query } from '../db.js';
import { richiediAuth } from '../middleware/auth.js';
import { richiediRuolo, ACCESSO_COMPLETO } from '../middleware/ruoli.js';

const router = express.Router();
router.use(richiediAuth);
const soloResponsabile = richiediRuolo(ACCESSO_COMPLETO);

router.get('/', async (req, res) => {
  const { rows } = await query('SELECT * FROM lavoratori WHERE attivo = true ORDER BY cognome, nome');
  res.json(rows);
});

router.post('/', soloResponsabile, async (req, res) => {
  const { nome, cognome, email, telefono, mansione, note } = req.body;
  if (!nome || !cognome || !email) return res.status(400).json({ errore: 'nome, cognome, email richiesti' });

  const { rows } = await query(
    `INSERT INTO lavoratori (nome, cognome, email, telefono, mansione, note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [nome, cognome, email, telefono, mansione, note]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', soloResponsabile, async (req, res) => {
  const { id } = req.params;
  const { nome, cognome, email, telefono, mansione, note } = req.body;
  const { rows } = await query(
    `UPDATE lavoratori SET nome=$1, cognome=$2, email=$3, telefono=$4, mansione=$5, note=$6 WHERE id=$7 RETURNING *`,
    [nome, cognome, email, telefono, mansione, note, id]
  );
  if (!rows[0]) return res.status(404).json({ errore: 'Lavoratore non trovato' });
  res.json(rows[0]);
});

// Disattivazione soft-delete: non elimina fisicamente per non rompere lo storico squadre passate
router.delete('/:id', soloResponsabile, async (req, res) => {
  await query('UPDATE lavoratori SET attivo = false WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

export default router;
