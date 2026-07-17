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

// Email al referente di un gruppo esterno (es. Gruppo Samy, Gruppo Aemme) con la
// richiesta numerica di personale per un evento. I nominativi arrivano poi per altra via.
export async function inviaRichiestaGruppo({ to, nomeGruppo, numeroRichiesto, nomeEvento, dataEvento, luogo }) {
  const dataFormattata = new Date(dataEvento).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Richiesta personale - ${nomeEvento} (${dataFormattata})`,
    html: `
      <div style="font-family: 'EB Garamond', Georgia, serif; max-width: 560px; margin: 0 auto; color: #232021; background: #FDFCFA; padding: 24px;">
        <h2 style="color:#232021;">Richiesta personale — ${nomeGruppo}</h2>
        <p>Ciao,</p>
        <p>Per il seguente evento ci servirebbero <strong>${numeroRichiesto} person${numeroRichiesto === 1 ? 'a' : 'e'}</strong>:</p>
        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding:4px 0;"><strong>Evento:</strong></td><td>${nomeEvento}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Data:</strong></td><td>${dataFormattata}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Luogo:</strong></td><td>${luogo || '-'}</td></tr>
        </table>
        <p>Facci sapere chi potrà essere presente, grazie!</p>
        <p style="font-size: 13px; color: #B5A329; border-top: 1px solid #EFEBDF; padding-top: 10px; margin-top:24px;">Rock Srl Catering</p>
      </div>
    `
  });
}

// "Lunedì 20 Luglio" — giorno della settimana, numero, mese (senza anno, per restare compatto in elenco)
function formattaGiornoEsteso(data) {
  const d = new Date(data);
  const giorno = d.toLocaleDateString('it-IT', { weekday: 'long' });
  const numero = d.getDate();
  const mese = d.toLocaleDateString('it-IT', { month: 'long' });
  const giornoCap = giorno.charAt(0).toUpperCase() + giorno.slice(1);
  const meseCap = mese.charAt(0).toUpperCase() + mese.slice(1);
  return `${giornoCap} ${numero} ${meseCap}`;
}

// Orario e punto di ritrovo per una singola persona su un singolo evento
function formattaRitrovo(ev) {
  const inSede = ev.punto_ritrovo !== 'location';
  const orario = inSede ? ev.ora_partenza_sede : ev.ora_ritrovo_location;
  const orarioStr = orario ? orario.slice(0, 5) : 'da definire';
  return `${orarioStr} ${inSede ? 'in sede' : 'in location'}`;
}

// Una sola email settimanale per un lavoratore, con tutti i suoi eventi della settimana
// elencati, ciascuno con il proprio link di conferma indipendente.
export async function inviaRichiestaSettimanaleLavoratore({ to, nomeLavoratore, eventi }) {
  if (!eventi || eventi.length === 0) return;
  const rangeInizio = formattaGiornoEsteso(eventi[0].data_evento);

  const righeEventi = eventi.map(ev => {
    const link = `${FRONTEND_PUBLIC_URL}/disponibilita/${ev.token}`;
    return `
      <div style="border:1px solid #EFEBDF; border-radius:4px; padding:14px 16px; margin-bottom:12px;">
        <p style="margin:0 0 4px; font-weight:600;">${formattaGiornoEsteso(ev.data_evento)} — ${ev.evento_nome}</p>
        <p style="margin:0 0 4px; color:#6B665C; font-size:14px;">Ritrovo: ${formattaRitrovo(ev)}</p>
        <p style="margin:0 0 10px; color:#6B665C; font-size:14px;">Location evento: ${ev.luogo || '-'}</p>
        <a href="${link}" style="display:inline-block; background:#232021; color:#FDFCFA; padding:8px 18px; text-decoration:none; border-radius:4px; font-size:14px;">Conferma la tua disponibilità</a>
      </div>
    `;
  }).join('');

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Disponibilità settimana del ${rangeInizio} — ${eventi.length} event${eventi.length === 1 ? 'o' : 'i'}`,
    html: `
      <div style="font-family: 'EB Garamond', Georgia, serif; max-width: 560px; margin: 0 auto; color: #232021; background: #FDFCFA; padding: 24px;">
        <h2 style="color:#232021; font-family:'Montserrat', sans-serif; font-weight:700;">Richiesta disponibilità</h2>
        <p>Ciao ${nomeLavoratore},</p>
        <p>Ti proponiamo per questi eventi. Conferma ognuno separatamente:</p>
        ${righeEventi}
        <p style="font-size: 13px; color: #B5A349; border-top: 1px solid #EFEBDF; padding-top: 10px; margin-top:24px;">Rock Srl Catering — Lanzarotti 1967 / Sport Catering</p>
      </div>
    `
  });
}

// Una sola email settimanale per un gruppo esterno, con tutte le richieste della
// settimana elencate (stesso formato dettagliato dei lavoratori: data, ritrovo, location).
export async function inviaRichiestaSettimanaleGruppo({ to, nomeGruppo, richieste }) {
  if (!richieste || richieste.length === 0) return;
  const rangeInizio = formattaGiornoEsteso(richieste[0].data_evento);

  const righeRichieste = richieste.map(r => {
    const link = `${FRONTEND_PUBLIC_URL}/gruppo-risposta/${r.token}`;
    return `
      <div style="border:1px solid #EFEBDF; border-radius:4px; padding:14px 16px; margin-bottom:12px;">
        <p style="margin:0 0 4px; font-weight:600;">${formattaGiornoEsteso(r.data_evento)} — ${r.evento_nome}</p>
        <p style="margin:0 0 4px; color:#6B665C; font-size:14px;">Persone richieste: <strong>${r.numero_richiesto}</strong></p>
        <p style="margin:0 0 4px; color:#6B665C; font-size:14px;">Ritrovo: ${formattaRitrovo(r)}</p>
        <p style="margin:0 0 10px; color:#6B665C; font-size:14px;">Location evento: ${r.luogo || '-'}</p>
        <a href="${link}" style="display:inline-block; background:#232021; color:#FDFCFA; padding:8px 18px; text-decoration:none; border-radius:4px; font-size:14px;">Confermate la disponibilità</a>
      </div>
    `;
  }).join('');

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Richiesta personale settimana del ${rangeInizio} — ${nomeGruppo}`,
    html: `
      <div style="font-family: 'EB Garamond', Georgia, serif; max-width: 560px; margin: 0 auto; color: #232021; background: #FDFCFA; padding: 24px;">
        <h2 style="color:#232021; font-family:'Montserrat', sans-serif; font-weight:700;">Richiesta personale — ${nomeGruppo}</h2>
        <p>Ciao,</p>
        <p>Per questi eventi ci servirebbe personale. Confermate ogni evento separatamente, poi ci fate sapere i nominativi:</p>
        ${righeRichieste}
        <p style="font-size: 13px; color: #B5A349; border-top: 1px solid #EFEBDF; padding-top: 10px; margin-top:24px;">Rock Srl Catering</p>
      </div>
    `
  });
}
