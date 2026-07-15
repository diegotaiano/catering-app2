import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'Rock Srl Catering <squadre@rocksrl.it>';
const FRONTEND_PUBLIC_URL = process.env.FRONTEND_PUBLIC_URL || 'http://localhost:5173';

// Email al lavoratore con il link magico per rispondere disponibile/non disponibile
export async function inviaRichiestaDisponibilita({ to, nomeLavoratore, nomeEvento, dataEvento, luogo, oraPartenzaSede, oraRitrovoLocation, oraInizio, ruolo, token }) {
  const link = `${FRONTEND_PUBLIC_URL}/disponibilita/${token}`;
  const dataFormattata = new Date(dataEvento).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Richiesta disponibilità - ${nomeEvento} (${dataFormattata})`,
    html: `
      <div style="font-family: 'EB Garamond', Georgia, serif; max-width: 560px; margin: 0 auto; color: #232021; background: #FDFCFA; padding: 24px;">
        <h2 style="color:#232021; font-family:'Montserrat', sans-serif; font-weight:700;">Richiesta di disponibilità</h2>
        <p>Ciao ${nomeLavoratore},</p>
        <p>Ti proponiamo per il seguente evento:</p>
        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding:4px 0;"><strong>Evento:</strong></td><td>${nomeEvento}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Data:</strong></td><td>${dataFormattata}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Luogo:</strong></td><td>${luogo || '-'}</td></tr>
          ${oraPartenzaSede ? `<tr><td style="padding:4px 0;"><strong>Partenza da sede:</strong></td><td>${oraPartenzaSede.slice(0,5)}</td></tr>` : ''}
          ${oraRitrovoLocation ? `<tr><td style="padding:4px 0;"><strong>Ritrovo in location:</strong></td><td>${oraRitrovoLocation.slice(0,5)}</td></tr>` : ''}
          ${oraInizio ? `<tr><td style="padding:4px 0;"><strong>Inizio servizio:</strong></td><td>${oraInizio.slice(0,5)}</td></tr>` : ''}
          <tr><td style="padding:4px 0;"><strong>Ruolo:</strong></td><td>${ruolo || '-'}</td></tr>
        </table>
        <p>Fai clic sul pulsante qui sotto per confermare o rifiutare la tua disponibilità:</p>
        <p style="text-align:center; margin: 24px 0;">
          <a href="${link}" style="background:#232021; border: 1px solid #B5A349; color:#fff; padding:12px 28px; text-decoration:none; border-radius:4px; font-weight:bold;">
            Rispondi alla richiesta
          </a>
        </p>
        <p style="font-size: 13px; color: #B5A349; border-top: 1px solid #EFEBDF; padding-top: 10px;">Rock Srl Catering — Lanzarotti 1967 / Sport Catering</p>
      </div>
    `
  });
}

// Email al referente commerciale con la lista squadra finale confermata
export async function inviaListaSquadraAlReferente({ to, nomeEvento, dataEvento, squadreConMembri }) {
  const dataFormattata = new Date(dataEvento).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

  const righeSquadre = squadreConMembri.map(sq => `
    <h3 style="color:#B5A349; margin-bottom:4px;">${sq.nome}</h3>
    <ul style="margin-top:4px;">
      ${sq.membri.map(m => `<li>${m.nome} ${m.cognome} — ${m.ruolo_specifico || m.mansione}${m.gruppo ? ` <em>(${m.gruppo})</em>` : ''}</li>`).join('')}
    </ul>
  `).join('');

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Squadra confermata - ${nomeEvento} (${dataFormattata})`,
    html: `
      <div style="font-family: 'EB Garamond', Georgia, serif; max-width: 560px; margin: 0 auto; color: #232021; background: #FDFCFA; padding: 24px;">
        <h2>Squadra confermata: ${nomeEvento}</h2>
        <p><strong>Data evento:</strong> ${dataFormattata}</p>
        ${righeSquadre}
        <p style="font-size: 13px; color: #B5A349; border-top: 1px solid #EFEBDF; padding-top: 10px; margin-top:24px;">Rock Srl Catering</p>
      </div>
    `
  });
}
