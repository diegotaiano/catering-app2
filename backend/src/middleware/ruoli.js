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
