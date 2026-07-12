// Ruoli con accesso completo: creano/modificano eventi, squadre, furgoni, anagrafica
export const ACCESSO_COMPLETO = ['responsabile_servizio', 'hr_manager'];

// Ruoli che vedono TUTTI gli eventi, ma in sola lettura
export const LETTURA_TUTTI_EVENTI = ['amministrazione', 'commerciale', 'capisquadra'];

// Ruoli il cui accesso e' filtrato: vedono solo un sottoinsieme di eventi
export const RUOLI_SCOPED = ['referente_commerciale', 'capo_servizio'];

export const TUTTI_I_RUOLI = [...ACCESSO_COMPLETO, ...LETTURA_TUTTI_EVENTI, ...RUOLI_SCOPED];

export function haAccessoCompleto(ruolo) {
  return ACCESSO_COMPLETO.includes(ruolo);
}

export function vedeTuttiGliEventi(ruolo) {
  return ACCESSO_COMPLETO.includes(ruolo) || LETTURA_TUTTI_EVENTI.includes(ruolo);
}

// Middleware da usare DOPO richiediAuth: verifica che req.utente.ruolo
// sia tra quelli consentiti, altrimenti risponde 403.
export function richiediRuolo(ruoliConsentiti) {
  return (req, res, next) => {
    if (!req.utente || !ruoliConsentiti.includes(req.utente.ruolo)) {
      return res.status(403).json({ errore: 'Non hai i permessi per compiere questa azione' });
    }
    next();
  };
}

// Costruisce la clausola WHERE (parametrizzata) da applicare alle query sugli eventi,
// in base al ruolo dell'utente. Ritorna { clausola, valori } da usare a partire da $N.
export function filtroEventiPerRuolo(utente, indiceParametroIniziale) {
  if (vedeTuttiGliEventi(utente.ruolo)) {
    return { clausola: '', valori: [] };
  }
  if (utente.ruolo === 'referente_commerciale') {
    if (!utente.referente_commerciale_id) return { clausola: ' AND false', valori: [] };
    return { clausola: ` AND e.referente_commerciale_id = $${indiceParametroIniziale}`, valori: [utente.referente_commerciale_id] };
  }
  if (utente.ruolo === 'capo_servizio') {
    return { clausola: ` AND e.capo_servizio_id = $${indiceParametroIniziale}`, valori: [utente.id] };
  }
  // ruolo sconosciuto: nessun evento visibile, per sicurezza
  return { clausola: ' AND false', valori: [] };
}
