import express from 'express';
import { query } from '../db.js';
import { richiediAuth } from '../middleware/auth.js';
import { richiediRuolo, ACCESSO_COMPLETO, filtroEventiPerRuolo } from '../middleware/ruoli.js';

const router = express.Router();
router.use(richiediAuth);

// Lista eventi (filtrata in base al ruolo: alcuni vedono tutto, altri solo i propri).
// Esclude sempre quelli nel cestino.
router.get('/', async (req, res) => {
  const { clausola, valori } = filtroEventiPerRuolo(req.utente, 1);
  const { rows } = await query(
    `SELECT e.*, r.nome AS referente_nome, r.cognome AS referente_cognome,
       cs.nome AS capo_servizio_nome, cs.cognome AS capo_servizio_cognome
     FROM eventi e
     LEFT JOIN referenti_commerciali r ON r.id = e.referente_commerciale_id
     LEFT JOIN utenti cs ON cs.id = e.capo_servizio_id
     WHERE e.eliminato_il IS NULL ${clausola}
     ORDER BY e.data_evento ASC`,
    valori
  );
  res.json(rows);
});

// Cestino: eventi eliminati, recuperabili. Solo per chi ha accesso completo.
router.get('/cestino', richiediRuolo(ACCESSO_COMPLETO), async (req, res) => {
  const { rows } = await query(
    `SELECT e.*, r.nome AS referente_nome, r.cognome AS referente_cognome,
       cs.nome AS capo_servizio_nome, cs.cognome AS capo_servizio_cognome
     FROM eventi e
     LEFT JOIN referenti_commerciali r ON r.id = e.referente_commerciale_id
     LEFT JOIN utenti cs ON cs.id = e.capo_servizio_id
     WHERE e.eliminato_il IS NOT NULL
     ORDER BY e.eliminato_il DESC`
  );
  res.json(rows);
});

// Dettaglio evento + squadre + membri
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const evento = await query(
    `SELECT e.*, r.nome AS referente_nome, r.cognome AS referente_cognome,
       cs.nome AS capo_servizio_nome, cs.cognome AS capo_servizio_cognome
     FROM eventi e
     LEFT JOIN referenti_commerciali r ON r.id = e.referente_commerciale_id
     LEFT JOIN utenti cs ON cs.id = e.capo_servizio_id
     WHERE e.id = $1`,
    [id]
  );
  if (!evento.rows[0]) return res.status(404).json({ errore: 'Evento non trovato' });

  const ev = evento.rows[0];
  const { ruolo } = req.utente;
  const autorizzato =
    ACCESSO_COMPLETO.includes(ruolo) ||
    ['amministrazione', 'commerciale', 'capisquadra'].includes(ruolo) ||
    (ruolo === 'referente_commerciale' && req.utente.referente_commerciale_id && ev.referente_commerciale_id === req.utente.referente_commerciale_id) ||
    (ruolo === 'capo_servizio' && ev.capo_servizio_id === req.utente.id);

  if (!autorizzato) return res.status(403).json({ errore: 'Non hai accesso a questo evento' });

  // Migrazione automatica: eventi creati prima dell'introduzione della lista automatica
  // ne restano privi. Ne creiamo una al volo, così l'utente non deve mai gestirlo a mano.
  const conteggioSquadre = await query('SELECT COUNT(*) FROM squadre WHERE evento_id = $1', [id]);
  if (Number(conteggioSquadre.rows[0].count) === 0) {
    await query(
      `INSERT INTO squadre (evento_id, nome, creata_da) VALUES ($1, 'Personale evento', $2)`,
      [id, req.utente.id]
    );
  }

  const squadre = await query(
    `SELECT sq.*,
       COALESCE(json_agg(
         json_build_object(
           'id', sm.id, 'lavoratore_id', sm.lavoratore_id,
           'nome', l.nome, 'cognome', l.cognome, 'mansione', l.mansione,
           'ruolo_specifico', sm.ruolo_specifico,
           'gruppo', sm.gruppo,
           'punto_ritrovo', sm.punto_ritrovo,
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

// Crea evento — solo chi ha accesso completo
router.post('/', richiediRuolo(ACCESSO_COMPLETO), async (req, res) => {
  const { nome, brand, cliente, luogo, luogo_url, data_evento, ora_partenza_sede, ora_ritrovo_location, ora_inizio, ora_fine, numero_ospiti_adulti, numero_bambini, numero_staff, referente_commerciale_id, capo_servizio_id, note } = req.body;
  if (!nome || !data_evento) return res.status(400).json({ errore: 'nome e data_evento richiesti' });
  if (!referente_commerciale_id) return res.status(400).json({ errore: 'Il referente commerciale è obbligatorio' });
  if (!capo_servizio_id) return res.status(400).json({ errore: 'Il capo servizio è obbligatorio' });

  const { rows } = await query(
    `INSERT INTO eventi (nome, brand, cliente, luogo, luogo_url, data_evento, ora_partenza_sede, ora_ritrovo_location, ora_inizio, ora_fine, numero_ospiti_adulti, numero_bambini, numero_staff, referente_commerciale_id, capo_servizio_id, responsabile_servizio_id, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
    [nome, brand, cliente, luogo, luogo_url || null, data_evento, ora_partenza_sede, ora_ritrovo_location, ora_inizio, ora_fine, numero_ospiti_adulti, numero_bambini, numero_staff, referente_commerciale_id, capo_servizio_id, req.utente.id, note]
  );

  // Ogni evento ha una lista personale unica, creata automaticamente (non serve più il passaggio manuale "crea squadra")
  await query(
    `INSERT INTO squadre (evento_id, nome, creata_da) VALUES ($1, 'Personale evento', $2)`,
    [rows[0].id, req.utente.id]
  );

  res.status(201).json(rows[0]);
});

// Aggiorna evento — solo chi ha accesso completo
router.put('/:id', richiediRuolo(ACCESSO_COMPLETO), async (req, res) => {
  const { id } = req.params;
  const campi = ['nome', 'brand', 'cliente', 'luogo', 'luogo_url', 'data_evento', 'ora_partenza_sede', 'ora_ritrovo_location', 'ora_inizio', 'ora_fine', 'numero_ospiti_adulti', 'numero_bambini', 'numero_staff', 'referente_commerciale_id', 'capo_servizio_id', 'stato', 'note'];
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

// Sposta l'evento nel cestino (soft-delete) — solo chi ha accesso completo.
// Non elimina nulla fisicamente: resta recuperabile da "Eliminati".
router.delete('/:id', richiediRuolo(ACCESSO_COMPLETO), async (req, res) => {
  const { id } = req.params;
  const risultato = await query(
    `UPDATE eventi SET eliminato_il = now() WHERE id = $1 AND eliminato_il IS NULL RETURNING id`,
    [id]
  );
  if (!risultato.rows[0]) return res.status(404).json({ errore: 'Evento non trovato' });
  res.status(204).send();
});

// Ripristina un evento dal cestino — solo chi ha accesso completo.
router.post('/:id/ripristina', richiediRuolo(ACCESSO_COMPLETO), async (req, res) => {
  const { id } = req.params;
  const risultato = await query(
    `UPDATE eventi SET eliminato_il = NULL WHERE id = $1 RETURNING *`,
    [id]
  );
  if (!risultato.rows[0]) return res.status(404).json({ errore: 'Evento non trovato' });
  res.json(risultato.rows[0]);
});

// Eliminazione definitiva e irreversibile — solo dal cestino, solo chi ha accesso completo.
// Elimina a cascata anche squadre/membri e assegnazioni furgoni.
router.delete('/:id/definitivo', richiediRuolo(ACCESSO_COMPLETO), async (req, res) => {
  const { id } = req.params;
  const risultato = await query(
    `DELETE FROM eventi WHERE id = $1 AND eliminato_il IS NOT NULL RETURNING id`,
    [id]
  );
  if (!risultato.rows[0]) {
    return res.status(404).json({ errore: 'Evento non trovato nel cestino (deve essere prima spostato lì)' });
  }
  res.status(204).send();
});

export default router;
