import express from 'express';
import multer from 'multer';
import { query } from '../db.js';
import { richiediAuth } from '../middleware/auth.js';
import { ACCESSO_COMPLETO } from '../middleware/ruoli.js';

const router = express.Router();
router.use(richiediAuth);

// File in memoria (non su disco: il filesystem di Render non è persistente).
// Limite 15MB per file, ragionevole per documenti e immagini.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

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

// Elenco allegati (solo metadati, non il contenuto: resta leggero)
router.get('/:id/allegati', async (req, res) => {
  const { autorizzato } = await eventoVisibile(req, req.params.id);
  if (!autorizzato) return res.status(403).json({ errore: 'Non hai accesso a questo evento' });

  const { rows } = await query(
    `SELECT id, nome_file, tipo_mime, dimensione_byte, caricato_il
     FROM evento_allegati WHERE evento_id = $1 ORDER BY caricato_il DESC`,
    [req.params.id]
  );
  res.json(rows);
});

// Upload di uno o più file — solo chi ha accesso completo
router.post('/:id/allegati', upload.array('file', 10), async (req, res) => {
  if (!ACCESSO_COMPLETO.includes(req.utente.ruolo)) {
    return res.status(403).json({ errore: 'Non hai i permessi per caricare allegati' });
  }
  const { autorizzato, evento } = await eventoVisibile(req, req.params.id);
  if (!autorizzato || !evento) return res.status(404).json({ errore: 'Evento non trovato' });

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ errore: 'Nessun file ricevuto' });
  }

  const inseriti = [];
  for (const file of req.files) {
    const { rows } = await query(
      `INSERT INTO evento_allegati (evento_id, nome_file, tipo_mime, dimensione_byte, contenuto, caricato_da)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, nome_file, tipo_mime, dimensione_byte, caricato_il`,
      [req.params.id, file.originalname, file.mimetype, file.size, file.buffer, req.utente.id]
    );
    inseriti.push(rows[0]);
  }
  res.status(201).json(inseriti);
});

// Download di un singolo allegato
router.get('/:id/allegati/:allegatoId', async (req, res) => {
  const { autorizzato } = await eventoVisibile(req, req.params.id);
  if (!autorizzato) return res.status(403).json({ errore: 'Non hai accesso a questo evento' });

  const { rows } = await query(
    `SELECT nome_file, tipo_mime, contenuto FROM evento_allegati WHERE id = $1 AND evento_id = $2`,
    [req.params.allegatoId, req.params.id]
  );
  const allegato = rows[0];
  if (!allegato) return res.status(404).json({ errore: 'Allegato non trovato' });

  res.setHeader('Content-Type', allegato.tipo_mime || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(allegato.nome_file)}"`);
  res.send(allegato.contenuto);
});

// Elimina un allegato — solo chi ha accesso completo
router.delete('/:id/allegati/:allegatoId', async (req, res) => {
  if (!ACCESSO_COMPLETO.includes(req.utente.ruolo)) {
    return res.status(403).json({ errore: 'Non hai i permessi per eliminare allegati' });
  }
  const risultato = await query(
    `DELETE FROM evento_allegati WHERE id = $1 AND evento_id = $2 RETURNING id`,
    [req.params.allegatoId, req.params.id]
  );
  if (!risultato.rows[0]) return res.status(404).json({ errore: 'Allegato non trovato' });
  res.status(204).send();
});

export default router;
