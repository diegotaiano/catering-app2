import express from 'express';
import { query } from '../db.js';
import { richiediAuth } from '../middleware/auth.js';
import { generaPdfEvento } from '../utils/pdf.js';

const router = express.Router();
router.use(richiediAuth);

router.get('/eventi/:id/pdf', async (req, res) => {
  const { id } = req.params;

  const eventoRes = await query(
    `SELECT e.*, r.nome AS referente_nome, r.cognome AS referente_cognome
     FROM eventi e
     LEFT JOIN referenti_commerciali r ON r.id = e.referente_commerciale_id
     WHERE e.id = $1`,
    [id]
  );
  const evento = eventoRes.rows[0];
  if (!evento) return res.status(404).json({ errore: 'Evento non trovato' });

  const squadreRes = await query(
    `SELECT sq.id, sq.nome,
       COALESCE(json_agg(
         json_build_object(
           'nome', l.nome, 'cognome', l.cognome, 'mansione', l.mansione,
           'ruolo_specifico', sm.ruolo_specifico, 'stato_disponibilita', sm.stato_disponibilita
         ) ORDER BY l.cognome
       ) FILTER (WHERE sm.id IS NOT NULL), '[]') AS membri
     FROM squadre sq
     LEFT JOIN squadra_membri sm ON sm.squadra_id = sq.id
     LEFT JOIN lavoratori l ON l.id = sm.lavoratore_id
     WHERE sq.evento_id = $1
     GROUP BY sq.id
     ORDER BY sq.id`,
    [id]
  );

  generaPdfEvento(res, evento, squadreRes.rows);
});

export default router;
