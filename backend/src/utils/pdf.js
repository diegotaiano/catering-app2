import PDFDocument from 'pdfkit';

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

// Genera il PDF del servizio e lo scrive sullo stream di risposta (res).
// evento: riga della tabella eventi (con nomi referente già uniti)
// squadre: array di { nome, membri: [{ nome, cognome, ruolo_specifico, mansione, stato_disponibilita }] }
export function generaPdfEvento(res, evento, squadre) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="scheda-servizio-${evento.id}.pdf"`);
  doc.pipe(res);

  // Intestazione
  doc.rect(0, 0, doc.page.width, 90).fill(NERO);
  doc.fillColor(ORO).font('Helvetica-Bold').fontSize(20).text('LANZAROTTI 1967', 50, 30);
  doc.fillColor('#D3C480').font('Helvetica').fontSize(10).text('SCHEDA SERVIZIO', 50, 56);
  doc.fillColor(NERO);

  doc.moveDown(3);
  doc.font('Helvetica-Bold').fontSize(16).fillColor(NERO).text(evento.nome, 50, 110);

  // Info servizio
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

  // Squadre e personale
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

  doc.fontSize(8).fillColor(GRIGIO)
    .text(`Documento generato il ${new Date().toLocaleDateString('it-IT')} — Rock Srl Catering`, 50, doc.page.height - 65);

  doc.end();
}
