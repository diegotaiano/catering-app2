import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// Il lavoratore apre il link e vede i dettagli della richiesta (GET pubblico)
router.get('/:token', async (req, res) => {
  const { token } = req.params;

  const { rows } = await query(
    `SELECT sm.id, sm.stato_disponibilita, sm.token_scadenza, sm.ruolo_specifico,
            l.nome, l.cognome,
            e.nome AS evento_nome, e.data_evento, e.luogo, e.ora_partenza_sede, e.ora_ritrovo_location, e.ora_inizio
     FROM squadra_membri sm
     JOIN lavoratori l ON l.id = sm.lavoratore_id
     JOIN squadre sq ON sq.id = sm.squadra_id
     JOIN eventi e ON e.id = sq.evento_id
     WHERE sm.token_risposta = $1`,
    [token]
  );

  const richiesta = rows[0];
  if (!richiesta) return res.status(404).json({ errore: 'Richiesta non trovata o link non valido' });

  if (new Date(richiesta.token_scadenza) < new Date()) {
    return res.status(410).json({ errore: 'Il link è scaduto. Contatta il responsabile di servizio.' });
  }

  res.json(richiesta);
});

// Il lavoratore invia la risposta (POST pubblico, protetto dal solo possesso del token)
router.post('/:token/rispondi', async (req, res) => {
  const { token } = req.params;
  const { disponibile, note } = req.body; // disponibile: true/false

  if (typeof disponibile !== 'boolean') {
    return res.status(400).json({ errore: 'Campo "disponibile" (booleano) richiesto' });
  }

  const check = await query(
    `SELECT id, token_scadenza, stato_disponibilita FROM squadra_membri WHERE token_risposta = $1`,
    [token]
  );
  const membro = check.rows[0];
  if (!membro) return res.status(404).json({ errore: 'Richiesta non trovata o link non valido' });
  if (new Date(membro.token_scadenza) < new Date()) {
    return res.status(410).json({ errore: 'Il link è scaduto. Contatta il responsabile di servizio.' });
  }

  const nuovoStato = disponibile ? 'disponibile' : 'non_disponibile';
  await query(
    `UPDATE squadra_membri SET stato_disponibilita = $1, risposta_il = now(), note_lavoratore = $2 WHERE id = $3`,
    [nuovoStato, note || null, membro.id]
  );

  res.json({ ok: true, stato: nuovoStato });
});

export default router;
