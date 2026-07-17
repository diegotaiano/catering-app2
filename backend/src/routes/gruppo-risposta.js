import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// Il referente del gruppo apre il link e vede i dettagli della richiesta (GET pubblico)
router.get('/:token', async (req, res) => {
  const { token } = req.params;

  const { rows } = await query(
    `SELECT rg.id, rg.nome_gruppo, rg.numero_richiesto, rg.stato, rg.token_scadenza, rg.punto_ritrovo,
            e.nome AS evento_nome, e.data_evento, e.luogo, e.ora_partenza_sede, e.ora_ritrovo_location
     FROM richieste_gruppo rg
     JOIN eventi e ON e.id = rg.evento_id
     WHERE rg.token_risposta = $1`,
    [token]
  );

  const richiesta = rows[0];
  if (!richiesta) return res.status(404).json({ errore: 'Richiesta non trovata o link non valido' });
  if (new Date(richiesta.token_scadenza) < new Date()) {
    return res.status(410).json({ errore: 'Il link è scaduto. Contatta Rock Srl Catering direttamente.' });
  }

  res.json(richiesta);
});

// Il referente del gruppo conferma o rifiuta (POST pubblico, protetto dal solo possesso del token)
router.post('/:token/rispondi', async (req, res) => {
  const { token } = req.params;
  const { confermato } = req.body; // confermato: true/false

  if (typeof confermato !== 'boolean') {
    return res.status(400).json({ errore: 'Campo "confermato" (booleano) richiesto' });
  }

  const check = await query(
    `SELECT id, token_scadenza FROM richieste_gruppo WHERE token_risposta = $1`,
    [token]
  );
  const richiesta = check.rows[0];
  if (!richiesta) return res.status(404).json({ errore: 'Richiesta non trovata o link non valido' });
  if (new Date(richiesta.token_scadenza) < new Date()) {
    return res.status(410).json({ errore: 'Il link è scaduto. Contatta Rock Srl Catering direttamente.' });
  }

  const nuovoStato = confermato ? 'confermata' : 'rifiutata';
  await query(
    `UPDATE richieste_gruppo SET stato = $1, risposta_il = now() WHERE id = $2`,
    [nuovoStato, richiesta.id]
  );

  res.json({ ok: true, stato: nuovoStato });
});

export default router;
