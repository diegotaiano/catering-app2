import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { richiediAuth } from '../middleware/auth.js';
import { richiediRuolo, ACCESSO_COMPLETO, TUTTI_I_RUOLI } from '../middleware/ruoli.js';

const router = express.Router();
router.use(richiediAuth);
router.use(richiediRuolo(ACCESSO_COMPLETO)); // tutta questa area è riservata

router.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.nome, u.cognome, u.email, u.ruolo, u.attivo, u.creato_il,
            u.referente_commerciale_id, r.nome AS referente_nome, r.cognome AS referente_cognome
     FROM utenti u
     LEFT JOIN referenti_commerciali r ON r.id = u.referente_commerciale_id
     ORDER BY u.cognome, u.nome`
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { nome, cognome, email, password, ruolo, referente_commerciale_id } = req.body;
  if (!nome || !cognome || !email || !password) {
    return res.status(400).json({ errore: 'nome, cognome, email e password sono richiesti' });
  }
  if (!TUTTI_I_RUOLI.includes(ruolo)) {
    return res.status(400).json({ errore: 'Ruolo non valido' });
  }
  if (ruolo === 'referente_commerciale' && !referente_commerciale_id) {
    return res.status(400).json({ errore: 'Per il ruolo referente commerciale devi indicare a quale referente collegare questo utente' });
  }

  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await query(
      `INSERT INTO utenti (nome, cognome, email, password_hash, ruolo, referente_commerciale_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, nome, cognome, email, ruolo, attivo, referente_commerciale_id`,
      [nome, cognome, email, hash, ruolo, ruolo === 'referente_commerciale' ? referente_commerciale_id : null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ errore: 'Esiste già un utente con questa email' });
    }
    throw err;
  }
});

// Cambia ruolo, collegamento al referente, o stato attivo/disattivo
// (mai la propria disattivazione, per non chiudersi fuori)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { ruolo, attivo, referente_commerciale_id } = req.body;

  if (Number(id) === req.utente.id && attivo === false) {
    return res.status(400).json({ errore: 'Non puoi disattivare il tuo stesso account' });
  }
  if (ruolo && !TUTTI_I_RUOLI.includes(ruolo)) {
    return res.status(400).json({ errore: 'Ruolo non valido' });
  }

  const campi = [];
  const valori = [];
  if (ruolo !== undefined) { campi.push(`ruolo = $${campi.length + 1}`); valori.push(ruolo); }
  if (attivo !== undefined) { campi.push(`attivo = $${campi.length + 1}`); valori.push(attivo); }
  if (referente_commerciale_id !== undefined) { campi.push(`referente_commerciale_id = $${campi.length + 1}`); valori.push(referente_commerciale_id); }
  if (campi.length === 0) return res.status(400).json({ errore: 'Nessun campo da aggiornare' });

  valori.push(id);
  const { rows } = await query(
    `UPDATE utenti SET ${campi.join(', ')} WHERE id = $${valori.length} RETURNING id, nome, cognome, email, ruolo, attivo, referente_commerciale_id`,
    valori
  );
  if (!rows[0]) return res.status(404).json({ errore: 'Utente non trovato' });
  res.json(rows[0]);
});

export default router;
