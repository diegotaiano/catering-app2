import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { haAccessoCompleto } from '../ruoli.js';

const VUOTO = {
  nome: '', brand: 'Lanzarotti1967', cliente: '', data_evento: '',
  ora_partenza_sede: '', ora_ritrovo_location: '', ora_inizio: '', ora_fine: '',
  luogo: '', numero_ospiti_adulti: '', numero_bambini: '', numero_staff: '', referente_commerciale_id: '', capo_servizio_id: '', note: ''
};

export default function Eventi() {
  const [eventi, setEventi] = useState([]);
  const [referenti, setReferenti] = useState([]);
  const [capiServizio, setCapiServizio] = useState([]);
  const [mostraForm, setMostraForm] = useState(false);
  const [nuovoEvento, setNuovoEvento] = useState(VUOTO);
  const [fileSelezionati, setFileSelezionati] = useState([]);
  const [errore, setErrore] = useState(null);
  const [annoAperto, setAnnoAperto] = useState(null);
  const utente = JSON.parse(localStorage.getItem('utente') || 'null');
  const puoCreare = haAccessoCompleto(utente);

  async function carica() {
    const [ev, ref, ut] = await Promise.all([api.getEventi(), api.getReferenti(), api.getUtenti().catch(() => [])]);
    setEventi(ev);
    setReferenti(ref);
    setCapiServizio(ut.filter(u => u.attivo));
  }

  useEffect(() => { carica(); }, []);

  async function handleCrea(e) {
    e.preventDefault();
    setErrore(null);
    try {
      const dati = {
        ...nuovoEvento,
        numero_ospiti_adulti: nuovoEvento.numero_ospiti_adulti ? Number(nuovoEvento.numero_ospiti_adulti) : null,
        numero_bambini: nuovoEvento.numero_bambini ? Number(nuovoEvento.numero_bambini) : null,
        numero_staff: nuovoEvento.numero_staff ? Number(nuovoEvento.numero_staff) : null,
        referente_commerciale_id: nuovoEvento.referente_commerciale_id ? Number(nuovoEvento.referente_commerciale_id) : null,
        capo_servizio_id: nuovoEvento.capo_servizio_id ? Number(nuovoEvento.capo_servizio_id) : null,
        ora_partenza_sede: nuovoEvento.ora_partenza_sede || null,
        ora_ritrovo_location: nuovoEvento.ora_ritrovo_location || null,
        ora_inizio: nuovoEvento.ora_inizio || null,
        ora_fine: nuovoEvento.ora_fine || null
      };
      const nuovo = await api.creaEvento(dati);
      if (fileSelezionati.length > 0) {
        try {
          await api.caricaAllegati(nuovo.id, fileSelezionati);
        } catch (errUpload) {
          setErrore(`Evento creato, ma il caricamento degli allegati è fallito: ${errUpload.message}`);
        }
      }
      setMostraForm(false);
      setNuovoEvento(VUOTO);
      setFileSelezionati([]);
      carica();
    } catch (err) {
      setErrore(err.message);
    }
  }

  return (
    <div className="container">
      <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14, letterSpacing: '0.03em', color: 'var(--oro-scuro)', margin: '0 0 4px', textTransform: 'uppercase' }}>
        Benvenuto, {utente?.nome}
      </p>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1>Eventi</h1>
        {puoCreare && (
          <button onClick={() => setMostraForm(!mostraForm)}>{mostraForm ? 'Annulla' : '+ Nuovo evento'}</button>
        )}
      </div>

      {utente?.ruolo === 'capo_servizio' && (
        <p style={{ color: '#8B5E3C', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
          Stai vedendo solo gli eventi a cui sei stato assegnato come capo servizio.
        </p>
      )}
      {utente?.ruolo === 'referente_commerciale' && (
        <p style={{ color: '#8B5E3C', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
          Stai vedendo solo gli eventi di cui sei il referente commerciale.
        </p>
      )}

      {mostraForm && puoCreare && (
        <div className="card">
          <h3>Nuovo evento</h3>
          {(referenti.length === 0 || capiServizio.length === 0) && (
            <p style={{ color: '#a33' }}>
              Referente commerciale e capo servizio sono obbligatori per creare un evento.{' '}
              {referenti.length === 0 && 'Non hai ancora nessun referente commerciale in anagrafica. '}
              {capiServizio.length === 0 && 'Non hai ancora nessun utente con ruolo capo servizio. '}
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

            <label style={{ fontSize: 13, color: '#8B5E3C' }}>Numero presenti</label>
            <div className="row">
              <input type="number" min="0" placeholder="Ospiti adulti" value={nuovoEvento.numero_ospiti_adulti}
                onChange={e => setNuovoEvento({ ...nuovoEvento, numero_ospiti_adulti: e.target.value })} />
              <input type="number" min="0" placeholder="Bambini" value={nuovoEvento.numero_bambini}
                onChange={e => setNuovoEvento({ ...nuovoEvento, numero_bambini: e.target.value })} />
              <input type="number" min="0" placeholder="Staff" value={nuovoEvento.numero_staff}
                onChange={e => setNuovoEvento({ ...nuovoEvento, numero_staff: e.target.value })} />
            </div>

            <div className="row">
              <select value={nuovoEvento.referente_commerciale_id} required
                onChange={e => setNuovoEvento({ ...nuovoEvento, referente_commerciale_id: e.target.value })}>
                <option value="">Referente commerciale... *</option>
                {referenti.map(r => <option key={r.id} value={r.id}>{r.nome} {r.cognome}</option>)}
              </select>
            </div>

            <select value={nuovoEvento.capo_servizio_id} required
              onChange={e => setNuovoEvento({ ...nuovoEvento, capo_servizio_id: e.target.value })}>
              <option value="">Capo servizio (chi gestirà l'evento)... *</option>
              {capiServizio.map(u => <option key={u.id} value={u.id}>{u.nome} {u.cognome}</option>)}
            </select>

            <textarea placeholder="Note (opzionale)" value={nuovoEvento.note}
              onChange={e => setNuovoEvento({ ...nuovoEvento, note: e.target.value })} rows={2} />

            <label style={{ fontSize: 13, color: '#8B5E3C' }}>
              Allegati (moduli, planimetrie, menu — opzionale)
            </label>
            <input type="file" multiple onChange={e => setFileSelezionati(Array.from(e.target.files || []))} />

            {errore && <p style={{ color: '#a33' }}>{errore}</p>}
            <button type="submit">Crea evento</button>
          </form>
        </div>
      )}

      {(() => {
        const oggi = new Date(); oggi.setHours(0, 0, 0, 0);
        const futuri = eventi.filter(ev => new Date(ev.data_evento) >= oggi)
          .sort((a, b) => new Date(a.data_evento) - new Date(b.data_evento));
        const passati = eventi.filter(ev => new Date(ev.data_evento) < oggi)
          .sort((a, b) => new Date(b.data_evento) - new Date(a.data_evento));

        const passatiPerAnno = {};
        passati.forEach(ev => {
          const anno = new Date(ev.data_evento).getFullYear();
          if (!passatiPerAnno[anno]) passatiPerAnno[anno] = [];
          passatiPerAnno[anno].push(ev);
        });
        const anni = Object.keys(passatiPerAnno).sort((a, b) => b - a);

        return (
          <>
            {futuri.map(ev => <CardEvento key={ev.id} ev={ev} />)}
            {futuri.length === 0 && passati.length === 0 && <p>Nessun evento ancora creato.</p>}

            {anni.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <h3 style={{ color: '#8B5E3C', borderBottom: '1px solid #e0d6bd', paddingBottom: 8 }}>Eventi passati</h3>
                {anni.map(anno => (
                  <div key={anno} style={{ marginBottom: 8 }}>
                    <div className="row" style={{ cursor: 'pointer', padding: '8px 4px' }}
                      onClick={() => setAnnoAperto(annoAperto === anno ? null : anno)}>
                      <strong>{anno}</strong>
                      <span style={{ color: '#8B5E3C', fontSize: 13 }}>
                        {passatiPerAnno[anno].length} event{passatiPerAnno[anno].length === 1 ? 'o' : 'i'} {annoAperto === anno ? '▲' : '▼'}
                      </span>
                    </div>
                    {annoAperto === anno && passatiPerAnno[anno].map(ev => <CardEvento key={ev.id} ev={ev} />)}
                  </div>
                ))}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

function CardEvento({ ev }) {
  return (
    <Link to={`/eventi/${ev.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="card">
        <div className="row">
          <div>
            <h3 style={{ margin: 0 }}>{ev.nome}</h3>
            <p style={{ margin: '4px 0', color: '#8B5E3C' }}>
              {new Date(ev.data_evento).toLocaleDateString('it-IT')} · {ev.luogo || 'luogo da definire'}
              {ev.referente_nome ? ` · Referente: ${ev.referente_nome} ${ev.referente_cognome}` : ' · Nessun referente assegnato'}
            </p>
            <span className={`badge ${ev.capo_servizio_nome ? 'disponibile' : 'da_contattare'}`}>
              {ev.capo_servizio_nome ? `Assegnato a: ${ev.capo_servizio_nome} ${ev.capo_servizio_cognome}` : 'Nessun capo servizio assegnato'}
            </span>
          </div>
          <span className="badge da_contattare">{ev.stato}</span>
        </div>
      </div>
    </Link>
  );
}

