import express from 'express';
import { query } from '../db.js';
import { richiediAuth } from '../middleware/auth.js';
import { richiediRuolo, ACCESSO_COMPLETO } from '../middleware/ruoli.js';

const router = express.Router();
router.use(richiediAuth);
const soloResponsabile = richiediRuolo(ACCESSO_COMPLETO);

// Anagrafica furgoni
router.get('/', async (req, res) => {
  const { rows } = await query('SELECT * FROM furgoni WHERE attivo = true ORDER BY nome');
  res.json(rows);
});

router.post('/', soloResponsabile, async (req, res) => {
  const { nome, targa, note } = req.body;
  if (!nome) return res.status(400).json({ errore: 'nome richiesto' });
  const { rows } = await query(
    `INSERT INTO furgoni (nome, targa, note) VALUES ($1,$2,$3) RETURNING *`,
    [nome, targa, note]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', soloResponsabile, async (req, res) => {
  const { id } = req.params;
  const { nome, targa, note } = req.body;
  const { rows } = await query(
    `UPDATE furgoni SET nome=$1, targa=$2, note=$3 WHERE id=$4 RETURNING *`,
    [nome, targa, note, id]
  );
  if (!rows[0]) return res.status(404).json({ errore: 'Furgone non trovato' });
  res.json(rows[0]);
});

router.delete('/:id', soloResponsabile, async (req, res) => {
  await query('UPDATE furgoni SET attivo = false WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

// Disponibilità furgoni per una data specifica (query string ?data=YYYY-MM-DD)
// Restituisce ogni furgone con lo stato: libero, oppure occupato + su quale evento
router.get('/disponibilita/:data', async (req, res) => {
  const { data } = req.params;
  const { rows } = await query(
    `SELECT f.id, f.nome, f.targa,
            fa.id AS assegnazione_id, fa.evento_id AS occupato_evento_id, e.nome AS occupato_evento_nome
     FROM furgoni f
     LEFT JOIN furgone_assegnazioni fa ON fa.furgone_id = f.id AND fa.data = $1
     LEFT JOIN eventi e ON e.id = fa.evento_id
     WHERE f.attivo = true
     ORDER BY f.nome`,
    [data]
  );
  res.json(rows);
});

// Assegna un furgone a un evento (usa la data dell'evento)
router.post('/assegna', soloResponsabile, async (req, res) => {
  const { furgone_id, evento_id } = req.body;
  if (!furgone_id || !evento_id) return res.status(400).json({ errore: 'furgone_id e evento_id richiesti' });

  const eventoRes = await query('SELECT data_evento, nome FROM eventi WHERE id = $1', [evento_id]);
  const evento = eventoRes.rows[0];
  if (!evento) return res.status(404).json({ errore: 'Evento non trovato' });

  try {
    const { rows } = await query(
      `INSERT INTO furgone_assegnazioni (furgone_id, evento_id, data, assegnato_da)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [furgone_id, evento_id, evento.data_evento, req.utente.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') { // violazione UNIQUE(furgone_id, data)
      const occupatoRes = await query(
        `SELECT e.nome FROM furgone_assegnazioni fa JOIN eventi e ON e.id = fa.evento_id
         WHERE fa.furgone_id = $1 AND fa.data = $2`,
        [furgone_id, evento.data_evento]
      );
      return res.status(409).json({
        errore: `Questo furgone è già assegnato all'evento "${occupatoRes.rows[0]?.nome}" per il ${new Date(evento.data_evento).toLocaleDateString('it-IT')}`
      });
    }
    throw err;
  }
});

// Rimuovi assegnazione furgone da un evento
router.delete('/assegnazioni/:id', soloResponsabile, async (req, res) => {
  await query('DELETE FROM furgone_assegnazioni WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

// Assegnazioni furgoni per un evento specifico
router.get('/evento/:eventoId', async (req, res) => {
  const { rows } = await query(
    `SELECT fa.id AS assegnazione_id, f.id AS furgone_id, f.nome, f.targa
     FROM furgone_assegnazioni fa JOIN furgoni f ON f.id = fa.furgone_id
     WHERE fa.evento_id = $1`,
    [req.params.eventoId]
  );
  res.json(rows);
});

export default router;
