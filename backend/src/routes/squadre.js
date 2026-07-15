import express from 'express';
import { query } from '../db.js';
import { richiediAuth } from '../middleware/auth.js';
import { richiediRuolo, ACCESSO_COMPLETO } from '../middleware/ruoli.js';
import { generaTokenRisposta, scadenzaDefault } from '../utils/token.js';
import { inviaRichiestaDisponibilita, inviaListaSquadraAlReferente } from '../utils/email.js';

const router = express.Router();
router.use(richiediAuth);
const soloResponsabile = richiediRuolo(ACCESSO_COMPLETO);

// Crea una nuova squadra per un evento (es. "Sala", "Cucina")
router.post('/', soloResponsabile, async (req, res) => {
  const { evento_id, nome } = req.body;
  if (!evento_id || !nome) return res.status(400).json({ errore: 'evento_id e nome richiesti' });

  const { rows } = await query(
    `INSERT INTO squadre (evento_id, nome, creata_da) VALUES ($1,$2,$3) RETURNING *`,
    [evento_id, nome, req.utente.id]
  );
  res.status(201).json(rows[0]);
});

// Aggiungi un lavoratore a una squadra. Stato di default: da_contattare (serve invio email).
// Per persone già confermate altrove (es. gruppi esterni) si può passare stato_disponibilita='disponibile'
// direttamente, saltando il giro dell'email.
router.post('/:squadraId/membri', soloResponsabile, async (req, res) => {
  const { squadraId } = req.params;
  const { lavoratore_id, ruolo_specifico, gruppo, stato_disponibilita } = req.body;
  if (!lavoratore_id) return res.status(400).json({ errore: 'lavoratore_id richiesto' });

  const statoIniziale = stato_disponibilita === 'disponibile' ? 'disponibile' : 'da_contattare';

  const { rows } = await query(
    `INSERT INTO squadra_membri (squadra_id, lavoratore_id, ruolo_specifico, gruppo, stato_disponibilita)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (squadra_id, lavoratore_id) DO UPDATE SET ruolo_specifico = EXCLUDED.ruolo_specifico, gruppo = EXCLUDED.gruppo, stato_disponibilita = EXCLUDED.stato_disponibilita
     RETURNING *`,
    [squadraId, lavoratore_id, ruolo_specifico, gruppo || null, statoIniziale]
  );
  res.status(201).json(rows[0]);
});

// Rimuovi un membro dalla squadra
router.delete('/membri/:membroId', soloResponsabile, async (req, res) => {
  await query('DELETE FROM squadra_membri WHERE id = $1', [req.params.membroId]);
  res.status(204).send();
});

// Invia (o re-invia) le richieste di disponibilità a tutti i membri "da_contattare" di una squadra
router.post('/:squadraId/invia-richieste', soloResponsabile, async (req, res) => {
  const { squadraId } = req.params;

  const squadraRes = await query(
    `SELECT sq.*, e.nome AS evento_nome, e.data_evento, e.luogo, e.ora_partenza_sede, e.ora_ritrovo_location, e.ora_inizio
     FROM squadre sq JOIN eventi e ON e.id = sq.evento_id
     WHERE sq.id = $1`,
    [squadraId]
  );
  const squadra = squadraRes.rows[0];
  if (!squadra) return res.status(404).json({ errore: 'Squadra non trovata' });

  const membriRes = await query(
    `SELECT sm.*, l.nome, l.cognome, l.email
     FROM squadra_membri sm JOIN lavoratori l ON l.id = sm.lavoratore_id
     WHERE sm.squadra_id = $1 AND sm.stato_disponibilita = 'da_contattare'`,
    [squadraId]
  );

  const risultati = [];
  for (const membro of membriRes.rows) {
    const token = generaTokenRisposta();
    const scadenza = scadenzaDefault();

    await query(
      `UPDATE squadra_membri SET token_risposta = $1, token_scadenza = $2, stato_disponibilita = 'in_attesa', email_inviata_il = now()
       WHERE id = $3`,
      [token, scadenza, membro.id]
    );

    try {
      await inviaRichiestaDisponibilita({
        to: membro.email,
        nomeLavoratore: membro.nome,
        nomeEvento: squadra.evento_nome,
        dataEvento: squadra.data_evento,
        luogo: squadra.luogo,
        oraPartenzaSede: squadra.ora_partenza_sede,
        oraRitrovoLocation: squadra.ora_ritrovo_location,
        oraInizio: squadra.ora_inizio,
        ruolo: membro.ruolo_specifico,
        token
      });
      risultati.push({ lavoratore: `${membro.nome} ${membro.cognome}`, inviato: true });
    } catch (err) {
      risultati.push({ lavoratore: `${membro.nome} ${membro.cognome}`, inviato: false, errore: err.message });
    }
  }

  await query(`UPDATE squadre SET stato = 'in_attesa_risposte' WHERE id = $1`, [squadraId]);
  res.json({ inviate: risultati.length, dettaglio: risultati });
});

// Conferma la squadra e invia la lista al referente commerciale
router.post('/:squadraId/conferma-e-invia-cliente', soloResponsabile, async (req, res) => {
  const { squadraId } = req.params;

  const squadraRes = await query(
    `SELECT sq.*, e.nome AS evento_nome, e.data_evento, e.referente_commerciale_id
     FROM squadre sq JOIN eventi e ON e.id = sq.evento_id WHERE sq.id = $1`,
    [squadraId]
  );
  const squadra = squadraRes.rows[0];
  if (!squadra) return res.status(404).json({ errore: 'Squadra non trovata' });

  const refRes = await query('SELECT * FROM referenti_commerciali WHERE id = $1', [squadra.referente_commerciale_id]);
  const referente = refRes.rows[0];
  if (!referente) return res.status(400).json({ errore: 'Nessun referente commerciale associato a questo evento' });

  // Prendo tutte le squadre dell'evento con membri disponibili, per una lista completa
  const tutteSquadre = await query(
    `SELECT sq.id, sq.nome,
       COALESCE(json_agg(
         json_build_object('nome', l.nome, 'cognome', l.cognome, 'mansione', l.mansione, 'ruolo_specifico', sm.ruolo_specifico, 'gruppo', l.gruppo)
       ) FILTER (WHERE sm.stato_disponibilita = 'disponibile'), '[]') AS membri
     FROM squadre sq
     LEFT JOIN squadra_membri sm ON sm.squadra_id = sq.id
     LEFT JOIN lavoratori l ON l.id = sm.lavoratore_id
     WHERE sq.evento_id = (SELECT evento_id FROM squadre WHERE id = $1)
     GROUP BY sq.id`,
    [squadraId]
  );

  await inviaListaSquadraAlReferente({
    to: referente.email,
    nomeEvento: squadra.evento_nome,
    dataEvento: squadra.data_evento,
    squadreConMembri: tutteSquadre.rows
  });

  await query(`UPDATE squadre SET stato = 'inviata_al_cliente', confermata_il = now(), inviata_il = now() WHERE id = $1`, [squadraId]);
  res.json({ ok: true, inviato_a: referente.email });
});

export default router;
