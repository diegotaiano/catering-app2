import PDFDocument from 'pdfkit';
import { PDFDocument as PDFLibDocument } from 'pdf-lib';

const NERO = '#232021';
const ORO = '#B5A349';
const GRIGIO = '#6B665C';

const ETICHETTE_STATO = {
  da_contattare: 'Da contattare',
  in_attesa: 'In attesa',
  disponibile: 'Confermato',
  non_disponibile: 'Non disponibile'
};

function formattaData(d) {
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formattaOra(t) {
  return t ? t.slice(0, 5) : null;
}

// Costruisce solo la copertina (info + squadra) con pdfkit, restituendola come Buffer
// invece di scriverla direttamente sulla risposta HTTP.
function costruisciCopertina(evento, squadre, allegati) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, doc.page.width, 90).fill(NERO);
    doc.fillColor(ORO).font('Helvetica-Bold').fontSize(20).text('LANZAROTTI 1967', 50, 30);
    doc.fillColor('#D3C480').font('Helvetica').fontSize(10).text('SCHEDA SERVIZIO', 50, 56);
    doc.fillColor(NERO);

    doc.moveDown(3);
    doc.font('Helvetica-Bold').fontSize(16).fillColor(NERO).text(evento.nome, 50, 110);

    let y = 145;
    const righe = [
      ['Data', formattaData(evento.data_evento)],
      ['Luogo', evento.luogo || '-'],
      ['Partenza da sede', formattaOra(evento.ora_partenza_sede) || '-'],
      ['Ritrovo in location', formattaOra(evento.ora_ritrovo_location) || '-'],
      ['Inizio servizio', formattaOra(evento.ora_inizio) || '-'],
      ['Fine servizio', formattaOra(evento.ora_fine) || '-'],
      ['Numero ospiti', evento.numero_ospiti != null ? String(evento.numero_ospiti) : '-'],
      ['Referente commerciale', evento.referente_nome ? `${evento.referente_nome} ${evento.referente_cognome}` : '-'],
      ['Capo servizio', evento.capo_servizio_nome ? `${evento.capo_servizio_nome} ${evento.capo_servizio_cognome}` : '-']
    ];

    doc.font('Helvetica').fontSize(11);
    righe.forEach(([etichetta, valore]) => {
      doc.fillColor(GRIGIO).text(etichetta, 50, y, { width: 160, continued: false });
      doc.fillColor(NERO).text(valore, 220, y);
      y += 20;
    });

    y += 15;
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(ORO).lineWidth(1).stroke();
    y += 20;

    squadre.forEach((squadra) => {
      if (y > doc.page.height - 120) { doc.addPage(); y = 50; }

      doc.font('Helvetica-Bold').fontSize(13).fillColor(NERO).text(squadra.nome.toUpperCase(), 50, y);
      y += 22;

      if (!squadra.membri || squadra.membri.length === 0) {
        doc.font('Helvetica').fontSize(10).fillColor(GRIGIO).text('Nessun membro assegnato', 60, y);
        y += 18;
      } else {
        squadra.membri.forEach((m) => {
          if (y > doc.page.height - 80) { doc.addPage(); y = 50; }
          const ruolo = m.ruolo_specifico || m.mansione || '';
          doc.font('Helvetica').fontSize(11).fillColor(NERO)
            .text(`${m.nome} ${m.cognome}`, 60, y, { continued: true, width: 250 })
            .fillColor(GRIGIO).text(ruolo ? `  —  ${ruolo}` : '', { continued: true });
          doc.fillColor(m.stato_disponibilita === 'disponibile' ? '#2f5c33' : GRIGIO)
            .font('Helvetica-Bold').fontSize(9)
            .text(`   ${ETICHETTE_STATO[m.stato_disponibilita] || m.stato_disponibilita}`, { continued: false });
          y += 18;
        });
      }
      y += 15;
    });

    if (allegati && allegati.length > 0) {
      if (y > doc.page.height - 140) { doc.addPage(); y = 50; }
      doc.font('Helvetica-Bold').fontSize(13).fillColor(NERO).text('ALLEGATI', 50, y);
      y += 20;
      doc.font('Helvetica').fontSize(10).fillColor(GRIGIO)
        .text('Le immagini e i PDF allegati sono incorporati nelle pagine successive. Altri formati restano scaricabili dall\'app.', 50, y, { width: doc.page.width - 100 });
      y += 24;
      allegati.forEach((a) => {
        if (y > doc.page.height - 60) { doc.addPage(); y = 50; }
        doc.fontSize(10).fillColor(NERO).text(`• ${a.nome_file}`, 60, y);
        y += 16;
      });
    }

    doc.fontSize(8).fillColor(GRIGIO)
      .text(`Documento generato il ${new Date().toLocaleDateString('it-IT')} — Rock Srl Catering`, 50, doc.page.height - 65);

    doc.end();
  });
}

// Incorpora gli allegati (immagini e PDF) come pagine aggiuntive nel documento finale.
async function fondiAllegati(bufferCopertina, allegati) {
  const docFinale = await PDFLibDocument.load(bufferCopertina);
  const LARGHEZZA_A4 = 595.28;
  const ALTEZZA_A4 = 841.89;

  for (const allegato of allegati) {
    const mime = (allegato.tipo_mime || '').toLowerCase();
    try {
      if (mime === 'application/pdf') {
        const docAllegato = await PDFLibDocument.load(allegato.contenuto, { ignoreEncryption: true });
        const pagine = await docFinale.copyPages(docAllegato, docAllegato.getPageIndices());
        pagine.forEach((pagina) => docFinale.addPage(pagina));
      } else if (mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/jpg') {
        const immagine = mime === 'image/png'
          ? await docFinale.embedPng(allegato.contenuto)
          : await docFinale.embedJpg(allegato.contenuto);
        const pagina = docFinale.addPage([LARGHEZZA_A4, ALTEZZA_A4]);
        const scala = Math.min(
          (LARGHEZZA_A4 - 80) / immagine.width,
          (ALTEZZA_A4 - 80) / immagine.height,
          1
        );
        const larghezza = immagine.width * scala;
        const altezza = immagine.height * scala;
        pagina.drawImage(immagine, {
          x: (LARGHEZZA_A4 - larghezza) / 2,
          y: (ALTEZZA_A4 - altezza) / 2,
          width: larghezza,
          height: altezza
        });
      }
      // Altri formati (docx, xlsx, ecc.) non vengono incorporati visivamente:
      // restano elencati per nome nella copertina e scaricabili singolarmente dall'app.
    } catch (err) {
      console.error(`Impossibile incorporare l'allegato "${allegato.nome_file}":`, err.message);
    }
  }

  const bytesFinali = await docFinale.save();
  return Buffer.from(bytesFinali);
}

// Genera il PDF completo (copertina + squadra + allegati incorporati) e lo scrive su res.
export async function generaPdfEvento(res, evento, squadre, allegati = []) {
  const bufferCopertina = await costruisciCopertina(evento, squadre, allegati);
  const bufferFinale = await fondiAllegati(bufferCopertina, allegati);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="scheda-servizio-${evento.id}.pdf"`);
  res.send(bufferFinale);
}
