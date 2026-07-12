import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const VUOTO = {
  nome: '', brand: 'Lanzarotti1967', cliente: '', data_evento: '',
  ora_partenza_sede: '', ora_ritrovo_location: '', ora_inizio: '', ora_fine: '',
  luogo: '', numero_ospiti: '', referente_commerciale_id: '', note: ''
};

export default function Eventi() {
  const [eventi, setEventi] = useState([]);
  const [referenti, setReferenti] = useState([]);
  const [mostraForm, setMostraForm] = useState(false);
  const [nuovoEvento, setNuovoEvento] = useState(VUOTO);
  const [errore, setErrore] = useState(null);

  async function carica() {
    const [ev, ref] = await Promise.all([api.getEventi(), api.getReferenti()]);
    setEventi(ev);
    setReferenti(ref);
  }

  useEffect(() => { carica(); }, []);

  async function handleCrea(e) {
    e.preventDefault();
    setErrore(null);
    try {
      const dati = {
        ...nuovoEvento,
        numero_ospiti: nuovoEvento.numero_ospiti ? Number(nuovoEvento.numero_ospiti) : null,
        referente_commerciale_id: nuovoEvento.referente_commerciale_id ? Number(nuovoEvento.referente_commerciale_id) : null,
        ora_partenza_sede: nuovoEvento.ora_partenza_sede || null,
        ora_ritrovo_location: nuovoEvento.ora_ritrovo_location || null,
        ora_inizio: nuovoEvento.ora_inizio || null,
        ora_fine: nuovoEvento.ora_fine || null
      };
      await api.creaEvento(dati);
      setMostraForm(false);
      setNuovoEvento(VUOTO);
      carica();
    } catch (err) {
      setErrore(err.message);
    }
  }

  return (
    <div className="container">
      <div className="row" style={{ marginBottom: 16 }}>
        <h1>Eventi</h1>
        <button onClick={() => setMostraForm(!mostraForm)}>{mostraForm ? 'Annulla' : '+ Nuovo evento'}</button>
      </div>

      {mostraForm && (
        <div className="card">
          <h3>Nuovo evento</h3>
          {referenti.length === 0 && (
            <p style={{ color: '#a33' }}>
              Non hai ancora nessun referente commerciale in anagrafica. Puoi comunque creare l'evento
              e assegnarlo dopo, ma senza referente non potrai inviare la lista squadra al cliente.{' '}
              <Link to="/anagrafica">Vai in Anagrafica →</Link>
            </p>
          )}
          <form onSubmit={handleCrea}>
            <input placeholder="Nome evento *" value={nuovoEvento.nome}
              onChange={e => setNuovoEvento({ ...nuovoEvento, nome: e.target.value })} required />

            <div className="row">
              <select value={nuovoEvento.brand} onChange={e => setNuovoEvento({ ...nuovoEvento, brand: e.target.value })}>
                <option value="Lanzarotti1967">Lanzarotti 1967</option>
                <option value="SportCatering">Sport Catering</option>
              </select>
              <input placeholder="Cliente" value={nuovoEvento.cliente}
                onChange={e => setNuovoEvento({ ...nuovoEvento, cliente: e.target.value })} />
            </div>

            <label style={{ fontSize: 13, color: '#8B5E3C' }}>Data evento *</label>
            <input type="date" value={nuovoEvento.data_evento}
              onChange={e => setNuovoEvento({ ...nuovoEvento, data_evento: e.target.value })} required />

            <div className="row">
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, color: '#8B5E3C' }}>Partenza da sede</label>
                <input type="time" value={nuovoEvento.ora_partenza_sede}
                  onChange={e => setNuovoEvento({ ...nuovoEvento, ora_partenza_sede: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, color: '#8B5E3C' }}>Ritrovo in location</label>
                <input type="time" value={nuovoEvento.ora_ritrovo_location}
                  onChange={e => setNuovoEvento({ ...nuovoEvento, ora_ritrovo_location: e.target.value })} />
              </div>
            </div>

            <div className="row">
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, color: '#8B5E3C' }}>Ora inizio servizio</label>
                <input type="time" value={nuovoEvento.ora_inizio}
                  onChange={e => setNuovoEvento({ ...nuovoEvento, ora_inizio: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, color: '#8B5E3C' }}>Ora fine servizio</label>
                <input type="time" value={nuovoEvento.ora_fine}
                  onChange={e => setNuovoEvento({ ...nuovoEvento, ora_fine: e.target.value })} />
              </div>
            </div>

            <input placeholder="Luogo" value={nuovoEvento.luogo}
              onChange={e => setNuovoEvento({ ...nuovoEvento, luogo: e.target.value })} />

            <div className="row">
              <input type="number" placeholder="Numero ospiti" value={nuovoEvento.numero_ospiti}
                onChange={e => setNuovoEvento({ ...nuovoEvento, numero_ospiti: e.target.value })} />
              <select value={nuovoEvento.referente_commerciale_id}
                onChange={e => setNuovoEvento({ ...nuovoEvento, referente_commerciale_id: e.target.value })}>
                <option value="">Referente commerciale...</option>
                {referenti.map(r => <option key={r.id} value={r.id}>{r.nome} {r.cognome}</option>)}
              </select>
            </div>

            <textarea placeholder="Note (opzionale)" value={nuovoEvento.note}
              onChange={e => setNuovoEvento({ ...nuovoEvento, note: e.target.value })} rows={2} />

            {errore && <p style={{ color: '#a33' }}>{errore}</p>}
            <button type="submit">Crea evento</button>
          </form>
        </div>
      )}

      {eventi.map(ev => (
        <Link key={ev.id} to={`/eventi/${ev.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card">
            <div className="row">
              <div>
                <h3 style={{ margin: 0 }}>{ev.nome}</h3>
                <p style={{ margin: '4px 0', color: '#8B5E3C' }}>
                  {new Date(ev.data_evento).toLocaleDateString('it-IT')} · {ev.luogo || 'luogo da definire'}
                  {ev.referente_nome ? ` · Referente: ${ev.referente_nome} ${ev.referente_cognome}` : ' · Nessun referente assegnato'}
                </p>
              </div>
              <span className="badge da_contattare">{ev.stato}</span>
            </div>
          </div>
        </Link>
      ))}
      {eventi.length === 0 && <p>Nessun evento ancora creato.</p>}
    </div>
  );
}

