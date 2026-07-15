import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth.js';
import eventiRoutes from './routes/eventi.js';
import squadreRoutes from './routes/squadre.js';
import disponibilitaRoutes from './routes/disponibilita.js';
import lavoratoriRoutes from './routes/lavoratori.js';
import referentiRoutes from './routes/referenti.js';
import furgoniRoutes from './routes/furgoni.js';
import pdfRoutes from './routes/pdf.js';
import utentiRoutes from './routes/utenti.js';
import allegatiRoutes from './routes/allegati.js';
import gruppiRoutes from './routes/gruppi.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/eventi', eventiRoutes);
app.use('/api/squadre', squadreRoutes);
app.use('/api/disponibilita', disponibilitaRoutes); // pubblico, nessun auth
app.use('/api/lavoratori', lavoratoriRoutes);
app.use('/api/referenti', referentiRoutes);
app.use('/api/furgoni', furgoniRoutes);
app.use('/api/eventi', pdfRoutes);
app.use('/api/utenti', utentiRoutes);
app.use('/api/eventi', allegatiRoutes);
app.use('/api/eventi', gruppiRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend in ascolto sulla porta ${PORT}`));
