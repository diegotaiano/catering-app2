import express from 'express';
import { query } from '../db.js';
import { richiediAuth } from '../middleware/auth.js';
import { richiediRuolo, ACCESSO_COMPLETO } from '../middleware/ruoli.js';

const router = express.Router();
router.use(richiediAuth);
const soloResponsabile = richiediRuolo(ACCESSO_COMPLETO);

router.get('/', async (req, res) => {
  const { rows } = await query(`
    SELECT * FROM lavoratori WHERE attivo = true
    ORDER BY
      CASE
        WHEN mansione ILIKE '%chef%' THEN 0
        WHEN mansione ILIKE '%aiuto%' THEN 1
        WHEN mansione ILIKE '%sbarazz%' THEN 2
        WHEN mansione ILIKE '%capo serv%' THEN 3
        WHEN mansione ILIKE '%camerier%' THEN 4
        ELSE 5
      END,
      cognome, nome
  `);
  res.json(rows);
});

// Disponibilità dei lavoratori per una data specifica: mostra chi è già assegnato
// a un altro evento nello stesso giorno (stessa logica di /furgoni/disponibilita/:data).
router.get('/disponibilita/:data', async (req, res) => {
  const { data } = req.params;
  const { rows } = await query(
    `SELECT l.*,
       oc.evento_id AS occupato_evento_id, oc.evento_nome AS occupato_evento_nome
     FROM lavoratori l
     LEFT JOIN LATERAL (
       SELECT e.id AS evento_id, e.nome AS evento_nome
       FROM squadra_membri sm
       JOIN squadre sq ON sq.id = sm.squadra_id
       JOIN eventi e ON e.id = sq.evento_id
       WHERE sm.lavoratore_id = l.id
         AND sm.stato_disponibilita <> 'non_disponibile'
         AND e.data_evento = $1::date
         AND e.eliminato_il IS NULL
       LIMIT 1
     ) oc ON true
     WHERE l.attivo = true
     ORDER BY
       CASE
         WHEN l.mansione ILIKE '%chef%' THEN 0
         WHEN l.mansione ILIKE '%aiuto%' THEN 1
         WHEN l.mansione ILIKE '%sbarazz%' THEN 2
         WHEN l.mansione ILIKE '%capo serv%' THEN 3
         WHEN l.mansione ILIKE '%camerier%' THEN 4
         ELSE 5
       END,
       l.cognome, l.nome`,
    [data]
  );
  res.json(rows);
});

router.post('/', soloResponsabile, async (req, res) => {
  const { nome, cognome, email, telefono, mansione, gruppo, note } = req.body;
  if (!nome || !cognome) return res.status(400).json({ errore: 'nome e cognome richiesti' });

  const { rows } = await query(
    `INSERT INTO lavoratori (nome, cognome, email, telefono, mansione, gruppo, note) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [nome, cognome, email || null, telefono, mansione, gruppo || null, note]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', soloResponsabile, async (req, res) => {
  const { id } = req.params;
  const { nome, cognome, email, telefono, mansione, gruppo, note } = req.body;
  const { rows } = await query(
    `UPDATE lavoratori SET nome=$1, cognome=$2, email=$3, telefono=$4, mansione=$5, gruppo=$6, note=$7 WHERE id=$8 RETURNING *`,
    [nome, cognome, email, telefono, mansione, gruppo || null, note, id]
  );
  if (!rows[0]) return res.status(404).json({ errore: 'Lavoratore non trovato' });
  res.json(rows[0]);
});

// Elenco nomi di gruppi esterni già usati, per suggerire il nome gruppo la prossima volta
router.get('/gruppi/suggerimenti', async (req, res) => {
  const { rows } = await query(
    `SELECT DISTINCT gruppo FROM lavoratori WHERE gruppo IS NOT NULL AND gruppo <> '' ORDER BY gruppo`
  );
  res.json(rows.map(r => r.gruppo));
});

// Persone già registrate per un determinato gruppo esterno, per suggerire i nomi
router.get('/gruppi/:nomeGruppo/persone', async (req, res) => {
  const { rows } = await query(
    `SELECT id, nome, cognome, mansione FROM lavoratori WHERE gruppo = $1 AND attivo = true ORDER BY cognome, nome`,
    [req.params.nomeGruppo]
  );
  res.json(rows);
});

// Disattivazione soft-delete: non elimina fisicamente per non rompere lo storico squadre passate
router.delete('/:id', soloResponsabile, async (req, res) => {
  await query('UPDATE lavoratori SET attivo = false WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

export default router;
