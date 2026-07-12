import express from 'express';
import { query } from '../db.js';
import { richiediAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(richiediAuth);

// Lista eventi (con filtro opzionale per data futura)
router.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT e.*, r.nome AS referente_nome, r.cognome AS referente_cognome
     FROM eventi e
     LEFT JOIN referenti_commerciali r ON r.id = e.referente_commerciale_id
     ORDER BY e.data_evento ASC`
  );
  res.json(rows);
});

// Dettaglio evento + squadre + membri
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const evento = await query('SELECT * FROM eventi WHERE id = $1', [id]);
  if (!evento.rows[0]) return res.status(404).json({ errore: 'Evento non trovato' });

  const squadre = await query(
    `SELECT sq.*,
       COALESCE(json_agg(
         json_build_object(
           'id', sm.id, 'lavoratore_id', sm.lavoratore_id,
           'nome', l.nome, 'cognome', l.cognome, 'mansione', l.mansione,
           'ruolo_specifico', sm.ruolo_specifico,
           'stato_disponibilita', sm.stato_disponibilita,
           'email_inviata_il', sm.email_inviata_il,
           'risposta_il', sm.risposta_il
         )
       ) FILTER (WHERE sm.id IS NOT NULL), '[]') AS membri
     FROM squadre sq
     LEFT JOIN squadra_membri sm ON sm.squadra_id = sq.id
     LEFT JOIN lavoratori l ON l.id = sm.lavoratore_id
     WHERE sq.evento_id = $1
     GROUP BY sq.id
     ORDER BY sq.id`,
    [id]
  );

  res.json({ ...evento.rows[0], squadre: squadre.rows });
});

// Crea evento
router.post('/', async (req, res) => {
  const { nome, brand, cliente, luogo, data_evento, ora_partenza_sede, ora_ritrovo_location, ora_inizio, ora_fine, numero_ospiti, referente_commerciale_id, note } = req.body;
  if (!nome || !data_evento) return res.status(400).json({ errore: 'nome e data_evento richiesti' });

  const { rows } = await query(
    `INSERT INTO eventi (nome, brand, cliente, luogo, data_evento, ora_partenza_sede, ora_ritrovo_location, ora_inizio, ora_fine, numero_ospiti, referente_commerciale_id, responsabile_servizio_id, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [nome, brand, cliente, luogo, data_evento, ora_partenza_sede, ora_ritrovo_location, ora_inizio, ora_fine, numero_ospiti, referente_commerciale_id, req.utente.id, note]
  );
  res.status(201).json(rows[0]);
});

// Aggiorna evento
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const campi = ['nome', 'brand', 'cliente', 'luogo', 'data_evento', 'ora_partenza_sede', 'ora_ritrovo_location', 'ora_inizio', 'ora_fine', 'numero_ospiti', 'referente_commerciale_id', 'stato', 'note'];
  const set = [];
  const valori = [];
  campi.forEach((c, i) => {
    if (req.body[c] !== undefined) {
      set.push(`${c} = $${set.length + 1}`);
      valori.push(req.body[c]);
    }
  });
  if (set.length === 0) return res.status(400).json({ errore: 'Nessun campo da aggiornare' });
  valori.push(id);
  const { rows } = await query(`UPDATE eventi SET ${set.join(', ')} WHERE id = $${valori.length} RETURNING *`, valori);
  res.json(rows[0]);
});

export default router;
