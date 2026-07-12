import express from 'express';
import { query } from '../db.js';
import { richiediAuth } from '../middleware/auth.js';
import { ACCESSO_COMPLETO } from '../middleware/ruoli.js';
import { generaPdfEvento } from '../utils/pdf.js';

const router = express.Router();
router.use(richiediAuth);

router.get('/:id/pdf', async (req, res) => {
  const { id } = req.params;

  const eventoRes = await query(
    `SELECT e.*, r.nome AS referente_nome, r.cognome AS referente_cognome,
       cs.nome AS capo_servizio_nome, cs.cognome AS capo_servizio_cognome
     FROM eventi e
     LEFT JOIN referenti_commerciali r ON r.id = e.referente_commerciale_id
     LEFT JOIN utenti cs ON cs.id = e.capo_servizio_id
     WHERE e.id = $1`,
    [id]
  );
  const evento = eventoRes.rows[0];
  if (!evento) return res.status(404).json({ errore: 'Evento non trovato' });

  const { ruolo } = req.utente;
  const autorizzato =
    ACCESSO_COMPLETO.includes(ruolo) ||
    ['amministrazione', 'commerciale', 'capisquadra'].includes(ruolo) ||
    (ruolo === 'referente_commerciale' && req.utente.referente_commerciale_id && evento.referente_commerciale_id === req.utente.referente_commerciale_id) ||
    (ruolo === 'capo_servizio' && evento.capo_servizio_id === req.utente.id);

  if (!autorizzato) return res.status(403).json({ errore: 'Non hai accesso a questo evento' });

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
