import express from 'express';
import { query } from '../db.js';
import { richiediAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(richiediAuth);

router.get('/', async (req, res) => {
  const { rows } = await query('SELECT * FROM referenti_commerciali WHERE attivo = true ORDER BY cognome, nome');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { nome, cognome, email } = req.body;
  if (!nome || !cognome || !email) return res.status(400).json({ errore: 'nome, cognome, email richiesti' });

  const { rows } = await query(
    `INSERT INTO referenti_commerciali (nome, cognome, email) VALUES ($1,$2,$3) RETURNING *`,
    [nome, cognome, email]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, cognome, email } = req.body;
  const { rows } = await query(
    `UPDATE referenti_commerciali SET nome = $1, cognome = $2, email = $3 WHERE id = $4 RETURNING *`,
    [nome, cognome, email, id]
  );
  if (!rows[0]) return res.status(404).json({ errore: 'Referente non trovato' });
  res.json(rows[0]);
});

// Disattivazione soft-delete (non elimina fisicamente, per non rompere eventi passati collegati)
router.delete('/:id', async (req, res) => {
  await query('UPDATE referenti_commerciali SET attivo = false WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

export default router;
