import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ errore: 'Email e password richiesti' });
  }

  const { rows } = await query('SELECT * FROM utenti WHERE email = $1 AND attivo = true', [email]);
  const utente = rows[0];
  if (!utente) return res.status(401).json({ errore: 'Credenziali non valide' });

  const passwordOk = await bcrypt.compare(password, utente.password_hash);
  if (!passwordOk) return res.status(401).json({ errore: 'Credenziali non valide' });

  const token = jwt.sign(
    { id: utente.id, email: utente.email, ruolo: utente.ruolo, nome: utente.nome, referente_commerciale_id: utente.referente_commerciale_id },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    token,
    utente: { id: utente.id, nome: utente.nome, cognome: utente.cognome, email: utente.email, ruolo: utente.ruolo }
  });
});

export default router;
