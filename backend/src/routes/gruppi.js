import express from 'express';
import { query } from '../db.js';
import { richiediAuth } from '../middleware/auth.js';
import { richiediRuolo, ACCESSO_COMPLETO } from '../middleware/ruoli.js';
import { inviaRichiestaGruppo } from '../utils/email.js';

const router = express.Router();
router.use(richiediAuth);
const soloResponsabile = richiediRuolo(ACCESSO_COMPLETO);

async function eventoVisibile(req, eventoId) {
  const eventoRes = await query('SELECT * FROM eventi WHERE id = $1', [eventoId]);
  const evento = eventoRes.rows[0];
  if (!evento) return { autorizzato: false, evento: null };
  const { ruolo } = req.utente;
  const autorizzato =
    ACCESSO_COMPLETO.includes(ruolo) ||
    ['amministrazione', 'commerciale', 'capisquadra'].includes(ruolo) ||
    (ruolo === 'referente_commerciale' && req.utente.referente_commerciale_id && evento.referente_commerciale_id === req.utente.referente_commerciale_id) ||
    (ruolo === 'capo_servizio' && evento.capo_servizio_id === req.utente.id);
  return { autorizzato, evento };
}

// Elenco richieste gruppo per un evento
router.get('/:id/gruppi', async (req, res) => {
  const { autorizzato } = await eventoVisibile(req, req.params.id);
  if (!autorizzato) return res.status(403).json({ errore: 'Non hai accesso a questo evento' });

  const { rows } = await query(
    `SELECT * FROM richieste_gruppo WHERE evento_id = $1 ORDER BY creato_il DESC`,
    [req.params.id]
  );
  res.json(rows);
});

// Crea una richiesta numerica a un gruppo esterno e manda la email (se c'è un contatto)
router.post('/:id/gruppi', soloResponsabile, async (req, res) => {
  const { nome_gruppo, numero_richiesto, email_contatto } = req.body;
  if (!nome_gruppo || !numero_richiesto) {
    return res.status(400).json({ errore: 'nome_gruppo e numero_richiesto sono richiesti' });
  }

  const { autorizzato, evento } = await eventoVisibile(req, req.params.id);
  if (!autorizzato || !evento) return res.status(404).json({ errore: 'Evento non trovato' });

  const { rows } = await query(
    `INSERT INTO richieste_gruppo (evento_id, nome_gruppo, numero_richiesto, email_contatto, creato_da)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [req.params.id, nome_gruppo, numero_richiesto, email_contatto || null, req.utente.id]
  );

  if (email_contatto) {
    try {
      await inviaRichiestaGruppo({
        to: email_contatto,
        nomeGruppo: nome_gruppo,
        numeroRichiesto: numero_richiesto,
        nomeEvento: evento.nome,
        dataEvento: evento.data_evento,
        luogo: evento.luogo
      });
    } catch (err) {
      console.error('Errore invio email richiesta gruppo:', err.message);
    }
  }

  res.status(201).json(rows[0]);
});

// Segna una richiesta come completata (tutti i nomi sono stati inseriti)
router.put('/:id/gruppi/:richiestaId', soloResponsabile, async (req, res) => {
  const { stato } = req.body;
  const { rows } = await query(
    `UPDATE richieste_gruppo SET stato = $1 WHERE id = $2 AND evento_id = $3 RETURNING *`,
    [stato, req.params.richiestaId, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ errore: 'Richiesta non trovata' });
  res.json(rows[0]);
});

router.delete('/:id/gruppi/:richiestaId', soloResponsabile, async (req, res) => {
  await query('DELETE FROM richieste_gruppo WHERE id = $1 AND evento_id = $2', [req.params.richiestaId, req.params.id]);
  res.status(204).send();
});

export default router;
