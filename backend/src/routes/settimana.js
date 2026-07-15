import express from 'express';
import { query } from '../db.js';
import { richiediAuth } from '../middleware/auth.js';
import { richiediRuolo, ACCESSO_COMPLETO } from '../middleware/ruoli.js';
import { generaTokenRisposta, scadenzaDefault } from '../utils/token.js';
import { inviaRichiestaSettimanaleLavoratore, inviaRichiestaSettimanaleGruppo } from '../utils/email.js';

const router = express.Router();
router.use(richiediAuth);

// Manda le richieste di disponibilità (lavoratori + gruppi) per tutti gli eventi
// di una settimana (lunedì-domenica), consolidando in una sola email per persona/gruppo.
router.post('/richiedi-disponibilita', richiediRuolo(ACCESSO_COMPLETO), async (req, res) => {
  const { inizio } = req.body; // 'YYYY-MM-DD', lunedì della settimana
  if (!inizio) return res.status(400).json({ errore: 'inizio (data lunedì) richiesto' });

  const dataInizio = new Date(inizio + 'T00:00:00');
  const dataFine = new Date(dataInizio);
  dataFine.setDate(dataFine.getDate() + 6);
  const fineStr = dataFine.toISOString().slice(0, 10);

  // --- Lavoratori singoli ---
  const membriRes = await query(
    `SELECT sm.id AS membro_id, sm.punto_ritrovo, l.id AS lavoratore_id, l.nome, l.cognome, l.email,
            e.id AS evento_id, e.nome AS evento_nome, e.data_evento, e.luogo,
            e.ora_partenza_sede, e.ora_ritrovo_location
     FROM squadra_membri sm
     JOIN lavoratori l ON l.id = sm.lavoratore_id
     JOIN squadre sq ON sq.id = sm.squadra_id
     JOIN eventi e ON e.id = sq.evento_id
     WHERE sm.stato_disponibilita = 'da_contattare'
       AND e.data_evento BETWEEN $1 AND $2
       AND e.eliminato_il IS NULL
       AND l.email IS NOT NULL AND l.email <> ''
     ORDER BY l.id, e.data_evento`,
    [inizio, fineStr]
  );

  const perLavoratore = new Map();
  for (const riga of membriRes.rows) {
    if (!perLavoratore.has(riga.lavoratore_id)) perLavoratore.set(riga.lavoratore_id, { info: riga, eventi: [] });
    perLavoratore.get(riga.lavoratore_id).eventi.push(riga);
  }

  let emailLavoratoriInviate = 0;
  for (const [, { info, eventi }] of perLavoratore) {
    const eventiConToken = [];
    for (const ev of eventi) {
      const token = generaTokenRisposta();
      const scadenza = scadenzaDefault();
      await query(
        `UPDATE squadra_membri SET token_risposta = $1, token_scadenza = $2, stato_disponibilita = 'in_attesa', email_inviata_il = now() WHERE id = $3`,
        [token, scadenza, ev.membro_id]
      );
      eventiConToken.push({ ...ev, token });
    }
    try {
      await inviaRichiestaSettimanaleLavoratore({
        to: info.email,
        nomeLavoratore: info.nome,
        eventi: eventiConToken
      });
      emailLavoratoriInviate++;
    } catch (err) {
      console.error(`Errore invio email a ${info.email}:`, err.message);
    }
  }

  // --- Gruppi esterni ---
  const gruppiRes = await query(
    `SELECT rg.id AS richiesta_id, rg.nome_gruppo, rg.numero_richiesto, rg.email_contatto, rg.punto_ritrovo,
            e.id AS evento_id, e.nome AS evento_nome, e.data_evento, e.luogo,
            e.ora_partenza_sede, e.ora_ritrovo_location
     FROM richieste_gruppo rg
     JOIN eventi e ON e.id = rg.evento_id
     WHERE rg.stato = 'in_attesa_invio'
       AND e.data_evento BETWEEN $1 AND $2
       AND e.eliminato_il IS NULL
       AND rg.email_contatto IS NOT NULL AND rg.email_contatto <> ''
     ORDER BY rg.email_contatto, e.data_evento`,
    [inizio, fineStr]
  );

  const perGruppo = new Map();
  for (const riga of gruppiRes.rows) {
    const chiave = `${riga.nome_gruppo}::${riga.email_contatto}`;
    if (!perGruppo.has(chiave)) perGruppo.set(chiave, { info: riga, richieste: [] });
    perGruppo.get(chiave).richieste.push(riga);
  }

  let emailGruppiInviate = 0;
  for (const [, { info, richieste }] of perGruppo) {
    const richiesteConToken = [];
    for (const r of richieste) {
      const token = generaTokenRisposta();
      const scadenza = scadenzaDefault();
      await query(
        `UPDATE richieste_gruppo SET token_risposta = $1, token_scadenza = $2, stato = 'inviata', email_inviata_il = now() WHERE id = $3`,
        [token, scadenza, r.richiesta_id]
      );
      richiesteConToken.push({ ...r, token });
    }
    try {
      await inviaRichiestaSettimanaleGruppo({
        to: info.email_contatto,
        nomeGruppo: info.nome_gruppo,
        richieste: richiesteConToken
      });
      emailGruppiInviate++;
    } catch (err) {
      console.error(`Errore invio email a ${info.email_contatto}:`, err.message);
    }
  }

  res.json({
    lavoratori_contattati: perLavoratore.size,
    email_lavoratori_inviate: emailLavoratoriInviate,
    gruppi_contattati: perGruppo.size,
    email_gruppi_inviate: emailGruppiInviate
  });
});

export default router;
