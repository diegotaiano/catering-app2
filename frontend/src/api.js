const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.errore || 'Errore di rete');
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  getEventi: () => request('/eventi'),
  getEvento: (id) => request(`/eventi/${id}`),
  creaEvento: (dati) => request('/eventi', { method: 'POST', body: dati }),
  aggiornaEvento: (id, dati) => request(`/eventi/${id}`, { method: 'PUT', body: dati }),
  eliminaEvento: (id) => request(`/eventi/${id}`, { method: 'DELETE' }),
  getLavoratori: () => request('/lavoratori'),
  creaLavoratore: (dati) => request('/lavoratori', { method: 'POST', body: dati }),
  aggiornaLavoratore: (id, dati) => request(`/lavoratori/${id}`, { method: 'PUT', body: dati }),
  eliminaLavoratore: (id) => request(`/lavoratori/${id}`, { method: 'DELETE' }),
  getReferenti: () => request('/referenti'),
  creaReferente: (dati) => request('/referenti', { method: 'POST', body: dati }),
  aggiornaReferente: (id, dati) => request(`/referenti/${id}`, { method: 'PUT', body: dati }),
  eliminaReferente: (id) => request(`/referenti/${id}`, { method: 'DELETE' }),
  getFurgoni: () => request('/furgoni'),
  creaFurgone: (dati) => request('/furgoni', { method: 'POST', body: dati }),
  aggiornaFurgone: (id, dati) => request(`/furgoni/${id}`, { method: 'PUT', body: dati }),
  eliminaFurgone: (id) => request(`/furgoni/${id}`, { method: 'DELETE' }),
  getDisponibilitaFurgoni: (data) => request(`/furgoni/disponibilita/${data}`),
  getFurgoniEvento: (eventoId) => request(`/furgoni/evento/${eventoId}`),
  assegnaFurgone: (furgone_id, evento_id) => request('/furgoni/assegna', { method: 'POST', body: { furgone_id, evento_id } }),
  rimuoviAssegnazioneFurgone: (assegnazioneId) => request(`/furgoni/assegnazioni/${assegnazioneId}`, { method: 'DELETE' }),
  scaricaPdfEvento: async (eventoId) => {
    const res = await fetch(`${API_URL}/eventi/${eventoId}/pdf`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('Impossibile generare il PDF');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scheda-servizio-${eventoId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  getUtenti: () => request('/utenti'),
  creaUtente: (dati) => request('/utenti', { method: 'POST', body: dati }),
  aggiornaUtente: (id, dati) => request(`/utenti/${id}`, { method: 'PUT', body: dati }),
  creaSquadra: (evento_id, nome) => request('/squadre', { method: 'POST', body: { evento_id, nome } }),
  aggiungiMembro: (squadraId, lavoratore_id, ruolo_specifico) =>
    request(`/squadre/${squadraId}/membri`, { method: 'POST', body: { lavoratore_id, ruolo_specifico } }),
  rimuoviMembro: (membroId) => request(`/squadre/membri/${membroId}`, { method: 'DELETE' }),
  inviaRichieste: (squadraId) => request(`/squadre/${squadraId}/invia-richieste`, { method: 'POST' }),
  confermaEInvia: (squadraId) => request(`/squadre/${squadraId}/conferma-e-invia-cliente`, { method: 'POST' }),
  // Pubbliche (magic link)
  getRichiestaDisponibilita: (token) => request(`/disponibilita/${token}`, { auth: false }),
  rispondiDisponibilita: (token, disponibile, note) =>
    request(`/disponibilita/${token}/rispondi`, { method: 'POST', body: { disponibile, note }, auth: false })
};
