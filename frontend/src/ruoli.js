// Ruoli con accesso completo: creano/modificano eventi, squadre, furgoni, anagrafica.
// Tenuto allineato manualmente con backend/src/middleware/ruoli.js
export const ACCESSO_COMPLETO = ['responsabile_servizio', 'hr_manager'];

export function haAccessoCompleto(utente) {
  return ACCESSO_COMPLETO.includes(utente?.ruolo);
}
