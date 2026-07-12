import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { haAccessoCompleto } from '../ruoli.js';

const ETICHETTE_STATO = {
  da_contattare: 'Da contattare',
  in_attesa: 'In attesa di risposta',
  disponibile: 'Disponibile',
  non_disponibile: 'Non disponibile'
};

export default function EventoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const utente = JSON.parse(localStorage.getItem('utente') || 'null');
  const puoModificare = haAccessoCompleto(utente);
  const [evento, setEvento] = useState(null);
  const [lavoratori, setLavoratori] = useState([]);
  const [referenti, setReferenti] = useState([]);
  const [capiServizio, setCapiServizio] = useState([]);
  const [nuovaSquadra, setNuovaSquadra] = useState('');
  const [messaggio, setMessaggio] = useState(null);
  const [modificaAperta, setModificaAperta] = useState(false);
  const [formEvento, setFormEvento] = useState(null);
  const [furgoni, setFurgoni] = useState([]);

  async function caricaFurgoni(dataEvento) {
    const data = dataEvento.slice(0, 10);
    setFurgoni(await api.getDisponibilitaFurgoni(data));
  }

  async function carica() {
    const [ev, lav, ref, ut] = await Promise.all([
      api.getEvento(id), api.getLavoratori(), api.getReferenti(), api.getUtenti().catch(() => [])
    ]);
    setEvento(ev);
    setLavoratori(lav);
    setReferenti(ref);
    setCapiServizio(ut.filter(u => u.attivo));
    await caricaFurgoni(ev.data_evento);
    if (!modificaAperta) {
      setFormEvento({
        nome: ev.nome, brand: ev.brand || 'Lanzarotti1967', cliente: ev.cliente || '',
        data_evento: ev.data_evento?.slice(0, 10) || '',
        ora_partenza_sede: ev.ora_partenza_sede || '', ora_ritrovo_location: ev.ora_ritrovo_location || '',
        ora_inizio: ev.ora_inizio || '', ora_fine: ev.ora_fine || '',
        luogo: ev.luogo || '', numero_ospiti: ev.numero_ospiti || '',
        referente_commerciale_id: ev.referente_commerciale_id || '', capo_servizio_id: ev.capo_servizio_id || '', note: ev.note || ''
      });
    }
  }

  useEffect(() => { carica(); }, [id]);

  async function handleSalvaEvento(e) {
    e.preventDefault();
    await api.aggiornaEvento(id, {
      ...formEvento,
      numero_ospiti: formEvento.numero_ospiti ? Number(formEvento.numero_ospiti) : null,
      referente_commerciale_id: formEvento.referente_commerciale_id ? Number(formEvento.referente_commerciale_id) : null,
      capo_servizio_id: formEvento.capo_servizio_id ? Number(formEvento.capo_servizio_id) : null,
      ora_partenza_sede: formEvento.ora_partenza_sede || null,
      ora_ritrovo_location: formEvento.ora_ritrovo_location || null,
      ora_inizio: formEvento.ora_inizio || null,
      ora_fine: formEvento.ora_fine || null
    });
    setModificaAperta(false);
    carica();
  }

  async function handleCreaSquadra(e) {
    e.preventDefault();
    if (!nuovaSquadra) return;
    await api.creaSquadra(id, nuovaSquadra);
    setNuovaSquadra('');
    carica();
  }

  async function handleAggiungiMembro(squadraId, lavoratoreId, ruolo) {
    if (!lavoratoreId) return;
    await api.aggiungiMembro(squadraId, Number(lavoratoreId), ruolo);
    carica();
  }

  async function handleInviaRichieste(squadraId) {
    const res = await api.inviaRichieste(squadraId);
    setMessaggio(`Inviate ${res.inviate} richieste di disponibilità.`);
    carica();
  }

  async function handleConfermaEInvia(squadraId) {
    try {
      const res = await api.confermaEInvia(squadraId);
      setMessaggio(`Lista squadra inviata a ${res.inviato_a}.`);
      carica();
    } catch (err) {
      setMessaggio(`Errore: ${err.message}`);
    }
  }

  async function handleAssegnaFurgone(furgoneId) {
    try {
      await api.assegnaFurgone(furgoneId, Number(id));
      setMessaggio(null);
      carica();
    } catch (err) {
      setMessaggio(`Errore: ${err.message}`);
    }
  }

  async function handleRimuoviFurgone(assegnazioneId) {
    await api.rimuoviAssegnazioneFurgone(assegnazioneId);
    carica();
  }

  async function handleScaricaPdf() {
    try {
      await api.scaricaPdfEvento(id);
    } catch (err) {
      setMessaggio(`Errore: ${err.message}`);
    }
  }

  async function handleEliminaEvento() {
    if (!confirm(`Eliminare definitivamente "${evento.nome}"? Questa azione non si può annullare: verranno eliminate anche squadre e assegnazioni furgoni collegate.`)) return;
    try {
      await api.eliminaEvento(id);
      navigate('/eventi');
    } catch (err) {
      setMessaggio(`Errore: ${err.message}`);
    }
  }

  if (!evento || !formEvento) return <div className="container">Caricamento...</div>;

  return (
    <div className="container">
      <div className="row">
        <div>
          <h1 style={{ marginBottom: 4 }}>{evento.nome}</h1>
          <p style={{ color: '#8B5E3C', margin: 0 }}>
            {new Date(evento.data_evento).toLocaleDateString('it-IT')} · {evento.luogo || 'luogo da definire'} · {evento.numero_ospiti || '?'} ospiti
            {evento.referente_nome ? ` · Referente: ${evento.referente_nome} ${evento.referente_cognome}` : ' · Nessun referente assegnato'}
          </p>
          <div style={{ marginTop: 8 }}>
            <span className={`badge ${evento.capo_servizio_nome ? 'disponibile' : 'da_contattare'}`} style={{ fontSize: 13 }}>
              Evento assegnato a: {evento.capo_servizio_nome ? `${evento.capo_servizio_nome} ${evento.capo_servizio_cognome}` : 'nessun capo servizio'}
            </span>
          </div>
        </div>
        <button className="secondary" onClick={handleScaricaPdf}>Scarica PDF scheda servizio</button>
        {puoModificare && (
          <button className="secondary" onClick={() => setModificaAperta(!modificaAperta)}>
            {modificaAperta ? 'Annulla' : 'Modifica evento'}
          </button>
        )}
        {puoModificare && (
          <button className="danger" onClick={handleEliminaEvento}>Elimina evento</button>
        )}
      </div>

      {modificaAperta && puoModificare && (
        <div className="card">
          <h3>Modifica evento</h3>
          <form onSubmit={handleSalvaEvento}>
            <input placeholder="Nome evento *" value={formEvento.nome}
              onChange={e => setFormEvento({ ...formEvento, nome: e.target.value })} required />
            <div className="row">
              <select value={formEvento.brand} onChange={e => setFormEvento({ ...formEvento, brand: e.target.value })}>
                <option value="Lanzarotti1967">Lanzarotti 1967</option>
                <option value="SportCatering">Sport Catering</option>
              </select>
              <input placeholder="Cliente" value={formEvento.cliente}
                onChange={e => setFormEvento({ ...formEvento, cliente: e.target.value })} />
            </div>
            <label style={{ fontSize: 13, color: '#8B5E3C' }}>Data evento *</label>
            <input type="date" value={formEvento.data_evento}
              onChange={e => setFormEvento({ ...formEvento, data_evento: e.target.value })} required />
            <div className="row">
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, color: '#8B5E3C' }}>Partenza da sede</label>
                <input type="time" value={formEvento.ora_partenza_sede}
                  onChange={e => setFormEvento({ ...formEvento, ora_partenza_sede: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, color: '#8B5E3C' }}>Ritrovo in location</label>
                <input type="time" value={formEvento.ora_ritrovo_location}
                  onChange={e => setFormEvento({ ...formEvento, ora_ritrovo_location: e.target.value })} />
              </div>
            </div>
            <div className="row">
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, color: '#8B5E3C' }}>Ora inizio servizio</label>
                <input type="time" value={formEvento.ora_inizio}
                  onChange={e => setFormEvento({ ...formEvento, ora_inizio: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, color: '#8B5E3C' }}>Ora fine servizio</label>
                <input type="time" value={formEvento.ora_fine}
                  onChange={e => setFormEvento({ ...formEvento, ora_fine: e.target.value })} />
              </div>
            </div>
            <input placeholder="Luogo" value={formEvento.luogo}
              onChange={e => setFormEvento({ ...formEvento, luogo: e.target.value })} />
            <div className="row">
              <input type="number" placeholder="Numero ospiti" value={formEvento.numero_ospiti}
                onChange={e => setFormEvento({ ...formEvento, numero_ospiti: e.target.value })} />
              <select value={formEvento.referente_commerciale_id}
                onChange={e => setFormEvento({ ...formEvento, referente_commerciale_id: e.target.value })}>
                <option value="">Referente commerciale...</option>
                {referenti.map(r => <option key={r.id} value={r.id}>{r.nome} {r.cognome}</option>)}
              </select>
            </div>
            <select value={formEvento.capo_servizio_id}
              onChange={e => setFormEvento({ ...formEvento, capo_servizio_id: e.target.value })}>
              <option value="">Capo servizio (chi gestirà l'evento)...</option>
              {capiServizio.map(u => <option key={u.id} value={u.id}>{u.nome} {u.cognome}</option>)}
            </select>
            <textarea placeholder="Note (opzionale)" value={formEvento.note}
              onChange={e => setFormEvento({ ...formEvento, note: e.target.value })} rows={2} />
            <button type="submit">Salva modifiche</button>
          </form>
        </div>
      )}

      {messaggio && <div className="card" style={{ background: '#fdf1d6' }}>{messaggio}</div>}

      <div className="card">
        <h3>Furgoni per il {new Date(evento.data_evento).toLocaleDateString('it-IT')}</h3>
        {furgoni.map(f => {
          const assegnatoAQuestoEvento = f.occupato_evento_id === Number(id);
          const occupatoDaAltri = f.occupato_evento_id && !assegnatoAQuestoEvento;
          return (
            <div key={f.id} className="row" style={{ padding: '6px 0', borderBottom: '1px solid #eee' }}>
              <span>{f.nome} {f.targa ? `(${f.targa})` : ''}</span>
              {assegnatoAQuestoEvento && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="badge disponibile">Assegnato a questo evento</span>
                  {puoModificare && <button className="danger" onClick={() => handleRimuoviFurgone(f.assegnazione_id)}>Rimuovi</button>}
                </div>
              )}
              {occupatoDaAltri && (
                <span className="badge non_disponibile">Occupato su "{f.occupato_evento_nome}"</span>
              )}
              {!f.occupato_evento_id && puoModificare && (
                <button className="secondary" onClick={() => handleAssegnaFurgone(f.id)}>Assegna a questo evento</button>
              )}
            </div>
          );
        })}
        {furgoni.length === 0 && (
          <p>Nessun furgone in anagrafica. Aggiungili in <a href="/anagrafica">Anagrafica</a>.</p>
        )}
      </div>

      {puoModificare && (
        <div className="card">
          <h3>Nuova squadra</h3>
          <form onSubmit={handleCreaSquadra} className="row">
            <input placeholder="es. Sala, Cucina, Bar" value={nuovaSquadra}
              onChange={e => setNuovaSquadra(e.target.value)} style={{ marginBottom: 0 }} />
            <button type="submit">Crea</button>
          </form>
        </div>
      )}

      {evento.squadre.map(sq => (
        <SquadraCard
          key={sq.id}
          squadra={sq}
          lavoratori={lavoratori}
          puoModificare={puoModificare}
          onAggiungiMembro={handleAggiungiMembro}
          onInviaRichieste={handleInviaRichieste}
          onConfermaEInvia={handleConfermaEInvia}
          onRimuovi={async (membroId) => { await api.rimuoviMembro(membroId); carica(); }}
        />
      ))}
    </div>
  );
}

function SquadraCard({ squadra, lavoratori, puoModificare, onAggiungiMembro, onInviaRichieste, onConfermaEInvia, onRimuovi }) {
  const [lavoratoreId, setLavoratoreId] = useState('');
  const [ruolo, setRuolo] = useState('');

  const tuttiDisponibili = squadra.membri.length > 0 && squadra.membri.every(m => m.stato_disponibilita === 'disponibile');
  const cePersoneDaContattare = squadra.membri.some(m => m.stato_disponibilita === 'da_contattare');

  return (
    <div className="card">
      <div className="row">
        <h3 style={{ margin: 0 }}>{squadra.nome}</h3>
        <span className="badge da_contattare">{squadra.stato}</span>
      </div>

      {squadra.membri.map(m => (
        <div key={m.id} className="row" style={{ padding: '6px 0', borderBottom: '1px solid #eee' }}>
          <span>{m.nome} {m.cognome} {m.ruolo_specifico ? `— ${m.ruolo_specifico}` : ''} <em style={{ color: '#999' }}>({m.mansione})</em></span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={`badge ${m.stato_disponibilita}`}>{ETICHETTE_STATO[m.stato_disponibilita]}</span>
            {puoModificare && <button className="danger" onClick={() => onRimuovi(m.id)}>Rimuovi</button>}
          </div>
        </div>
      ))}

      {puoModificare && (
        <>
          <div className="row" style={{ marginTop: 12 }}>
            <select value={lavoratoreId} onChange={e => setLavoratoreId(e.target.value)} style={{ marginBottom: 0 }}>
              <option value="">Aggiungi lavoratore...</option>
              {lavoratori.map(l => <option key={l.id} value={l.id}>{l.nome} {l.cognome} ({l.mansione})</option>)}
            </select>
            <input placeholder="Ruolo (opz.)" value={ruolo} onChange={e => setRuolo(e.target.value)} style={{ marginBottom: 0 }} />
            <button onClick={() => { onAggiungiMembro(squadra.id, lavoratoreId, ruolo); setLavoratoreId(''); setRuolo(''); }}>
              Aggiungi
            </button>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <button className="secondary" disabled={!cePersoneDaContattare} onClick={() => onInviaRichieste(squadra.id)}>
              Invia richieste disponibilità
            </button>
            <button disabled={!tuttiDisponibili} onClick={() => onConfermaEInvia(squadra.id)}>
              Conferma e invia al cliente
            </button>
          </div>
        </>
      )}
    </div>
  );
}
