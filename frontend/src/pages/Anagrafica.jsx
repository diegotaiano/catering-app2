import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { haAccessoCompleto } from '../ruoli.js';

const MANSIONI = ['Chef', 'Aiuto Cucina', 'Sbarazzo', 'Capo servizio', 'Cameriere', 'Barman'];

export default function Anagrafica() {
  const [scheda, setScheda] = useState('lavoratori');
  const utente = JSON.parse(localStorage.getItem('utente') || 'null');
  const puoGestireUtenti = haAccessoCompleto(utente);

  return (
    <div className="container">
      <h1>Anagrafica</h1>
      <div className="row" style={{ justifyContent: 'flex-start', gap: 8, marginBottom: 16 }}>
        <button className={scheda === 'lavoratori' ? '' : 'secondary'} onClick={() => setScheda('lavoratori')}>
          Lavoratori
        </button>
        <button className={scheda === 'referenti' ? '' : 'secondary'} onClick={() => setScheda('referenti')}>
          Referenti commerciali
        </button>
        <button className={scheda === 'furgoni' ? '' : 'secondary'} onClick={() => setScheda('furgoni')}>
          Furgoni
        </button>
        {puoGestireUtenti && (
          <button className={scheda === 'utenti' ? '' : 'secondary'} onClick={() => setScheda('utenti')}>
            Utenti app
          </button>
        )}
      </div>

      {scheda === 'lavoratori' ? <SchedaLavoratori />
        : scheda === 'referenti' ? <SchedaReferenti />
        : scheda === 'furgoni' ? <SchedaFurgoni />
        : <SchedaUtenti />}
    </div>
  );
}

// ---------- LAVORATORI ----------

function SchedaLavoratori() {
  const [lista, setLista] = useState([]);
  const [inModifica, setInModifica] = useState(null); // null = nessuno, 'nuovo' = form vuoto, id = modifica
  const [form, setForm] = useState(vuotoLavoratore());
  const utente = JSON.parse(localStorage.getItem('utente') || 'null');
  const puoModificare = haAccessoCompleto(utente);

  function vuotoLavoratore() {
    return { nome: '', cognome: '', email: '', telefono: '', mansione: 'Cameriere', note: '' };
  }

  async function carica() {
    setLista(await api.getLavoratori());
  }
  useEffect(() => { carica(); }, []);

  function avviaModifica(l) {
    setForm(l);
    setInModifica(l.id);
  }
  function avviaNuovo() {
    setForm(vuotoLavoratore());
    setInModifica('nuovo');
  }

  async function salva(e) {
    e.preventDefault();
    if (inModifica === 'nuovo') {
      await api.creaLavoratore(form);
    } else {
      await api.aggiornaLavoratore(inModifica, form);
    }
    setInModifica(null);
    carica();
  }

  async function disattiva(id) {
    if (!confirm('Disattivare questo lavoratore? Non comparirà più tra i selezionabili per le squadre.')) return;
    await api.eliminaLavoratore(id);
    carica();
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, color: '#8B5E3C' }}>{lista.length} lavoratori attivi</p>
        {puoModificare && <button onClick={avviaNuovo}>+ Nuovo lavoratore</button>}
      </div>

      {inModifica !== null && puoModificare && (
        <div className="card">
          <h3>{inModifica === 'nuovo' ? 'Nuovo lavoratore' : 'Modifica lavoratore'}</h3>
          <form onSubmit={salva}>
            <div className="row">
              <input placeholder="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
              <input placeholder="Cognome" value={form.cognome} onChange={e => setForm({ ...form, cognome: e.target.value })} required />
            </div>
            <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            <input placeholder="Telefono" value={form.telefono || ''} onChange={e => setForm({ ...form, telefono: e.target.value })} />
            <select value={form.mansione || 'Cameriere'} onChange={e => setForm({ ...form, mansione: e.target.value })}>
              {MANSIONI.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
            <textarea placeholder="Note (opzionale)" value={form.note || ''} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} />
            <div className="row">
              <button type="submit">Salva</button>
              <button type="button" className="secondary" onClick={() => setInModifica(null)}>Annulla</button>
            </div>
          </form>
        </div>
      )}

      {lista.map(l => (
        <div key={l.id} className="card">
          <div className="row">
            <div>
              <strong>{l.nome} {l.cognome}</strong>
              <p style={{ margin: '4px 0', color: '#8B5E3C' }}>{l.email} {l.telefono ? `· ${l.telefono}` : ''}</p>
              <span className="badge da_contattare">{l.mansione}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {puoModificare && (
                <>
                  <button className="secondary" onClick={() => avviaModifica(l)}>Modifica</button>
                  <button className="danger" onClick={() => disattiva(l.id)}>Disattiva</button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
      {lista.length === 0 && <p>Nessun lavoratore ancora inserito.</p>}
    </div>
  );
}

// ---------- REFERENTI COMMERCIALI ----------

function SchedaReferenti() {
  const [lista, setLista] = useState([]);
  const [inModifica, setInModifica] = useState(null);
  const [form, setForm] = useState(vuotoReferente());
  const utente = JSON.parse(localStorage.getItem('utente') || 'null');
  const puoModificare = haAccessoCompleto(utente);

  function vuotoReferente() {
    return { nome: '', cognome: '', email: '' };
  }

  async function carica() {
    setLista(await api.getReferenti());
  }
  useEffect(() => { carica(); }, []);

  function avviaModifica(r) {
    setForm(r);
    setInModifica(r.id);
  }
  function avviaNuovo() {
    setForm(vuotoReferente());
    setInModifica('nuovo');
  }

  async function salva(e) {
    e.preventDefault();
    if (inModifica === 'nuovo') {
      await api.creaReferente(form);
    } else {
      await api.aggiornaReferente(inModifica, form);
    }
    setInModifica(null);
    carica();
  }

  async function disattiva(id) {
    if (!confirm('Disattivare questo referente commerciale?')) return;
    await api.eliminaReferente(id);
    carica();
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, color: '#8B5E3C' }}>{lista.length} referenti attivi</p>
        {puoModificare && <button onClick={avviaNuovo}>+ Nuovo referente</button>}
      </div>

      {inModifica !== null && puoModificare && (
        <div className="card">
          <h3>{inModifica === 'nuovo' ? 'Nuovo referente commerciale' : 'Modifica referente'}</h3>
          <form onSubmit={salva}>
            <div className="row">
              <input placeholder="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
              <input placeholder="Cognome" value={form.cognome} onChange={e => setForm({ ...form, cognome: e.target.value })} required />
            </div>
            <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            <div className="row">
              <button type="submit">Salva</button>
              <button type="button" className="secondary" onClick={() => setInModifica(null)}>Annulla</button>
            </div>
          </form>
        </div>
      )}

      {lista.map(r => (
        <div key={r.id} className="card">
          <div className="row">
            <div>
              <strong>{r.nome} {r.cognome}</strong>
              <p style={{ margin: '4px 0', color: '#8B5E3C' }}>{r.email}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {puoModificare && (
                <>
                  <button className="secondary" onClick={() => avviaModifica(r)}>Modifica</button>
                  <button className="danger" onClick={() => disattiva(r.id)}>Disattiva</button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
      {lista.length === 0 && <p>Nessun referente ancora inserito.</p>}
    </div>
  );
}

// ---------- FURGONI ----------

function SchedaFurgoni() {
  const [lista, setLista] = useState([]);
  const [inModifica, setInModifica] = useState(null);
  const [form, setForm] = useState(vuotoFurgone());
  const utente = JSON.parse(localStorage.getItem('utente') || 'null');
  const puoModificare = haAccessoCompleto(utente);

  function vuotoFurgone() {
    return { nome: '', targa: '', note: '' };
  }

  async function carica() {
    setLista(await api.getFurgoni());
  }
  useEffect(() => { carica(); }, []);

  function avviaModifica(f) {
    setForm(f);
    setInModifica(f.id);
  }
  function avviaNuovo() {
    setForm(vuotoFurgone());
    setInModifica('nuovo');
  }

  async function salva(e) {
    e.preventDefault();
    if (inModifica === 'nuovo') {
      await api.creaFurgone(form);
    } else {
      await api.aggiornaFurgone(inModifica, form);
    }
    setInModifica(null);
    carica();
  }

  async function disattiva(id) {
    if (!confirm('Disattivare questo furgone? Non comparirà più tra i mezzi assegnabili.')) return;
    await api.eliminaFurgone(id);
    carica();
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, color: '#8B5E3C' }}>{lista.length} furgoni attivi</p>
        {puoModificare && <button onClick={avviaNuovo}>+ Nuovo furgone</button>}
      </div>

      {inModifica !== null && puoModificare && (
        <div className="card">
          <h3>{inModifica === 'nuovo' ? 'Nuovo furgone' : 'Modifica furgone'}</h3>
          <form onSubmit={salva}>
            <input placeholder="Nome (es. Furgone 1 - Fiat Ducato) *" value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })} required />
            <input placeholder="Targa" value={form.targa || ''} onChange={e => setForm({ ...form, targa: e.target.value })} />
            <textarea placeholder="Note (opzionale)" value={form.note || ''} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} />
            <div className="row">
              <button type="submit">Salva</button>
              <button type="button" className="secondary" onClick={() => setInModifica(null)}>Annulla</button>
            </div>
          </form>
        </div>
      )}

      {lista.map(f => (
        <div key={f.id} className="card">
          <div className="row">
            <div>
              <strong>{f.nome}</strong>
              <p style={{ margin: '4px 0', color: '#8B5E3C' }}>{f.targa || 'targa non inserita'}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {puoModificare && (
                <>
                  <button className="secondary" onClick={() => avviaModifica(f)}>Modifica</button>
                  <button className="danger" onClick={() => disattiva(f.id)}>Disattiva</button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
      {lista.length === 0 && <p>Nessun furgone ancora inserito.</p>}
    </div>
  );
}

// ---------- UTENTI APP (solo responsabile di servizio) ----------

function SchedaUtenti() {
  const [lista, setLista] = useState([]);
  const [referenti, setReferenti] = useState([]);
  const [mostraForm, setMostraForm] = useState(false);
  const [errore, setErrore] = useState(null);
  const [form, setForm] = useState({ nome: '', cognome: '', email: '', password: '', ruolo: 'capo_servizio', referente_commerciale_id: '' });
  const utenteCorrente = JSON.parse(localStorage.getItem('utente') || 'null');

  async function carica() {
    const [u, r] = await Promise.all([api.getUtenti(), api.getReferenti()]);
    setLista(u);
    setReferenti(r);
  }
  useEffect(() => { carica(); }, []);

  async function creaUtente(e) {
    e.preventDefault();
    setErrore(null);
    try {
      await api.creaUtente({
        ...form,
        referente_commerciale_id: form.ruolo === 'referente_commerciale' && form.referente_commerciale_id ? Number(form.referente_commerciale_id) : null
      });
      setForm({ nome: '', cognome: '', email: '', password: '', ruolo: 'capo_servizio', referente_commerciale_id: '' });
      setMostraForm(false);
      carica();
    } catch (err) {
      setErrore(err.message);
    }
  }

  async function cambiaRuolo(u, nuovoRuolo) {
    await api.aggiornaUtente(u.id, { ruolo: nuovoRuolo, referente_commerciale_id: nuovoRuolo === 'referente_commerciale' ? u.referente_commerciale_id : null });
    carica();
  }

  async function cambiaReferenteCollegato(u, referenteId) {
    await api.aggiornaUtente(u.id, { referente_commerciale_id: referenteId ? Number(referenteId) : null });
    carica();
  }

  async function disattiva(u) {
    if (u.id === utenteCorrente?.id) { alert('Non puoi disattivare il tuo stesso account.'); return; }
    if (!confirm(`Disattivare l'accesso di ${u.nome} ${u.cognome}?`)) return;
    await api.aggiornaUtente(u.id, { attivo: false });
    carica();
  }

  async function riattiva(u) {
    await api.aggiornaUtente(u.id, { attivo: true });
    carica();
  }

  const ETICHETTE_RUOLO = {
    hr_manager: 'HR Manager (pieno accesso)',
    responsabile_servizio: 'Responsabile di servizio (pieno accesso)',
    amministrazione: 'Amministrazione (legge tutti gli eventi)',
    commerciale: 'Commerciale (legge tutti gli eventi)',
    referente_commerciale: 'Referente commerciale (solo i propri eventi)',
    capo_servizio: 'Capo servizio (solo eventi assegnati)'
  };

  return (
    <div>
      <p style={{ color: '#8B5E3C', fontSize: 13, marginBottom: 12 }}>
        <strong>HR Manager</strong>: pieno accesso. <strong>Amministrazione/Commerciale</strong>: leggono tutti gli eventi.{' '}
        <strong>Referente commerciale</strong>: legge solo gli eventi di cui è il referente.{' '}
        <strong>Capo servizio</strong>: legge solo gli eventi a cui è assegnato.
      </p>
      <div className="row" style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, color: '#8B5E3C' }}>{lista.length} utenti</p>
        <button onClick={() => setMostraForm(!mostraForm)}>{mostraForm ? 'Annulla' : '+ Nuovo utente'}</button>
      </div>

      {mostraForm && (
        <div className="card">
          <h3>Nuovo utente</h3>
          <form onSubmit={creaUtente}>
            <div className="row">
              <input placeholder="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
              <input placeholder="Cognome" value={form.cognome} onChange={e => setForm({ ...form, cognome: e.target.value })} required />
            </div>
            <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            <input type="password" placeholder="Password iniziale" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            <select value={form.ruolo} onChange={e => setForm({ ...form, ruolo: e.target.value })}>
              <option value="hr_manager">HR Manager (pieno accesso)</option>
              <option value="amministrazione">Amministrazione (legge tutti gli eventi)</option>
              <option value="commerciale">Commerciale (legge tutti gli eventi)</option>
              <option value="referente_commerciale">Referente commerciale (solo i propri eventi)</option>
              <option value="capo_servizio">Capo servizio (solo eventi assegnati)</option>
            </select>
            {form.ruolo === 'referente_commerciale' && (
              <select value={form.referente_commerciale_id} onChange={e => setForm({ ...form, referente_commerciale_id: e.target.value })} required>
                <option value="">Collega al referente...</option>
                {referenti.map(r => <option key={r.id} value={r.id}>{r.nome} {r.cognome}</option>)}
              </select>
            )}
            {errore && <p style={{ color: '#a33' }}>{errore}</p>}
            <button type="submit">Crea utente</button>
          </form>
        </div>
      )}

      {lista.map(u => (
        <div key={u.id} className="card" style={{ opacity: u.attivo ? 1 : 0.5 }}>
          <div className="row">
            <div style={{ flex: 1 }}>
              <strong>{u.nome} {u.cognome}</strong> {u.id === utenteCorrente?.id && <span style={{ fontSize: 12, color: '#8B5E3C' }}>(tu)</span>}
              <p style={{ margin: '4px 0', color: '#8B5E3C' }}>{u.email}</p>
              <select value={u.ruolo} onChange={e => cambiaRuolo(u, e.target.value)} style={{ marginBottom: 6 }}>
                {Object.entries(ETICHETTE_RUOLO).filter(([v]) => v !== 'responsabile_servizio').map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
              {u.ruolo === 'referente_commerciale' && (
                <select value={u.referente_commerciale_id || ''} onChange={e => cambiaReferenteCollegato(u, e.target.value)} style={{ marginBottom: 0 }}>
                  <option value="">Collega al referente...</option>
                  {referenti.map(r => <option key={r.id} value={r.id}>{r.nome} {r.cognome}</option>)}
                </select>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {u.attivo
                ? <button className="danger" onClick={() => disattiva(u)}>Disattiva</button>
                : <button className="secondary" onClick={() => riattiva(u)}>Riattiva</button>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
