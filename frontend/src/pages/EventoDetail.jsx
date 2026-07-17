import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { haAccessoCompleto } from '../ruoli.js';
import CampoIndirizzo from '../components/CampoIndirizzo.jsx';

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
  const [messaggio, setMessaggio] = useState(null);
  const [modificaAperta, setModificaAperta] = useState(false);
  const [formEvento, setFormEvento] = useState(null);
  const [furgoni, setFurgoni] = useState([]);
  const [gruppiRichieste, setGruppiRichieste] = useState([]);
  const [suggerimentiGruppi, setSuggerimentiGruppi] = useState([]);

  async function caricaFurgoni(dataEvento) {
    if (puoModificare) {
      const data = dataEvento.slice(0, 10);
      setFurgoni(await api.getDisponibilitaFurgoni(data));
    } else {
      // Ruoli in sola lettura: niente dati sull'intera flotta o su altri eventi,
      // solo i furgoni effettivamente assegnati a questo evento.
      const assegnati = await api.getFurgoniEvento(id);
      setFurgoni(assegnati.map(a => ({
        id: a.furgone_id,
        nome: a.nome,
        targa: a.targa,
        assegnazione_id: a.assegnazione_id,
        occupato_evento_id: Number(id)
      })));
    }
  }

  async function carica() {
    const [ev, ref, ut, gruppi, suggGruppi] = await Promise.all([
      api.getEvento(id), api.getReferenti(), api.getUtenti().catch(() => []),
      api.getGruppiEvento(id).catch(() => []), api.getSuggerimentiGruppi().catch(() => [])
    ]);
    setEvento(ev);
    const lav = await api.getDisponibilitaLavoratori(ev.data_evento.slice(0, 10));
    setLavoratori(lav);
    setReferenti(ref);
    setCapiServizio(ut.filter(u => u.attivo));
    setGruppiRichieste(gruppi);
    setSuggerimentiGruppi(suggGruppi);
    await caricaFurgoni(ev.data_evento);
    if (!modificaAperta) {
      setFormEvento({
        nome: ev.nome, brand: ev.brand || 'Lanzarotti1967', cliente: ev.cliente || '',
        data_evento: ev.data_evento?.slice(0, 10) || '',
        ora_partenza_sede: ev.ora_partenza_sede || '', ora_ritrovo_location: ev.ora_ritrovo_location || '',
        ora_inizio: ev.ora_inizio || '', ora_fine: ev.ora_fine || '',
        luogo: ev.luogo || '', luogo_url: ev.luogo_url || '', numero_ospiti_adulti: ev.numero_ospiti_adulti || '', numero_bambini: ev.numero_bambini || '', numero_staff: ev.numero_staff || '',
        referente_commerciale_id: ev.referente_commerciale_id || '', capo_servizio_id: ev.capo_servizio_id || '', note: ev.note || ''
      });
    }
  }

  useEffect(() => { carica(); }, [id]);

  async function handleSalvaEvento(e) {
    e.preventDefault();
    await api.aggiornaEvento(id, {
      ...formEvento,
      numero_ospiti_adulti: formEvento.numero_ospiti_adulti ? Number(formEvento.numero_ospiti_adulti) : null,
      numero_bambini: formEvento.numero_bambini ? Number(formEvento.numero_bambini) : null,
      numero_staff: formEvento.numero_staff ? Number(formEvento.numero_staff) : null,
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

  async function handleAggiungiMembro(squadraId, lavoratoreId, ruolo) {
    if (!lavoratoreId) return;
    await api.aggiungiMembro(squadraId, Number(lavoratoreId), ruolo);
    carica();
  }

  async function handleAggiungiMembriMultipli(squadraId, idsLavoratori, gruppo, puntoRitrovo) {
    if (!idsLavoratori || idsLavoratori.length === 0) return;
    for (const idLavoratore of idsLavoratori) {
      await api.aggiungiMembro(squadraId, Number(idLavoratore), null, gruppo || null, null, puntoRitrovo || 'sede');
    }
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
      await api.scaricaPdfEvento(id, evento.nome);
    } catch (err) {
      setMessaggio(`Errore: ${err.message}`);
    }
  }

  async function handleVisualizzaPdf() {
    try {
      await api.visualizzaPdfEvento(id);
    } catch (err) {
      setMessaggio(`Errore: ${err.message}`);
    }
  }

  async function handleCreaRichiestaGruppo(dati) {
    try {
      await api.creaRichiestaGruppo(id, dati);
      carica();
      return true;
    } catch (err) {
      setMessaggio(`Errore: ${err.message}`);
      return false;
    }
  }

  async function handleEliminaRichiestaGruppo(richiestaId) {
    if (!confirm('Eliminare questa richiesta?')) return;
    await api.eliminaRichiestaGruppo(id, richiestaId);
    carica();
  }

  // Divide un testo incollato (una persona per riga) in nome/cognome, e li aggiunge
  // tutti in un colpo solo, riusando chi esiste già nello stesso gruppo.
  async function handleAggiungiListaGruppo(squadraId, testoLista, gruppo, puntoRitrovo) {
    const righe = testoLista
      .split('\n')
      .map(r => r.trim())
      .filter(r => r.length > 0);

    if (righe.length === 0) return;

    let personeGruppo = [];
    if (gruppo) {
      try { personeGruppo = await api.getPersoneGruppo(gruppo); } catch { personeGruppo = []; }
    }

    for (const riga of righe) {
      const parti = riga.split(/\s+/);
      const nome = parti[0] || riga;
      const cognome = parti.slice(1).join(' ') || '-';

      const esistente = personeGruppo.find(p =>
        p.nome.toLowerCase() === nome.toLowerCase() && p.cognome.toLowerCase() === cognome.toLowerCase()
      );

      try {
        let lavoratoreId = esistente?.id;
        if (!lavoratoreId) {
          const nuovo = await api.creaLavoratore({ nome, cognome, email: null, mansione: esistente?.mansione || null, gruppo: gruppo || null });
          lavoratoreId = nuovo.id;
        }
        await api.aggiungiMembro(squadraId, lavoratoreId, null, gruppo || null, 'disponibile', puntoRitrovo || 'sede');
      } catch (err) {
        setMessaggio(`Errore aggiungendo "${riga}": ${err.message}`);
      }
    }
    carica();
  }

  async function handleEliminaEvento() {
    if (!confirm(`Spostare "${evento.nome}" nel cestino? Potrai recuperarlo in qualsiasi momento da lì.`)) return;
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
            {new Date(evento.data_evento).toLocaleDateString('it-IT')} · {evento.luogo_url ? (
              <a href={evento.luogo_url} target="_blank" rel="noreferrer" style={{ color: 'var(--oro-scuro)' }}>{evento.luogo}</a>
            ) : (evento.luogo || 'luogo da definire')} · {evento.numero_ospiti_adulti || 0} adulti, {evento.numero_bambini || 0} bambini, {evento.numero_staff || 0} staff
            {evento.referente_nome ? ` · Referente: ${evento.referente_nome} ${evento.referente_cognome}` : ' · Nessun referente assegnato'}
          </p>
          <div style={{ marginTop: 8 }}>
            <span className={`badge ${evento.capo_servizio_nome ? 'disponibile' : 'da_contattare'}`} style={{ fontSize: 13 }}>
              Evento assegnato a: {evento.capo_servizio_nome ? `${evento.capo_servizio_nome} ${evento.capo_servizio_cognome}` : 'nessun capo servizio'}
            </span>
          </div>
        </div>
        <button className="secondary" onClick={handleVisualizzaPdf}>Visualizza PDF scheda servizio</button>
        {puoModificare && <button className="secondary" onClick={handleScaricaPdf}>Scarica PDF scheda servizio</button>}
        {puoModificare && (
          <button className="secondary" onClick={() => setModificaAperta(!modificaAperta)}>
            {modificaAperta ? 'Annulla' : 'Modifica evento'}
          </button>
        )}
        {puoModificare && (
          <button className="danger" onClick={handleEliminaEvento}>Sposta nel cestino</button>
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
            <CampoIndirizzo value={formEvento.luogo} linkAttuale={formEvento.luogo_url}
              onChange={(val, url) => setFormEvento({ ...formEvento, luogo: val, luogo_url: url })} />
            <label style={{ fontSize: 13, color: '#8B5E3C' }}>Numero presenti</label>
            <div className="row">
              <input type="number" min="0" placeholder="Ospiti adulti" value={formEvento.numero_ospiti_adulti}
                onChange={e => setFormEvento({ ...formEvento, numero_ospiti_adulti: e.target.value })} />
              <input type="number" min="0" placeholder="Bambini" value={formEvento.numero_bambini}
                onChange={e => setFormEvento({ ...formEvento, numero_bambini: e.target.value })} />
              <input type="number" min="0" placeholder="Staff" value={formEvento.numero_staff}
                onChange={e => setFormEvento({ ...formEvento, numero_staff: e.target.value })} />
            </div>
            <div className="row">
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
        <div className="row">
          <div>
            <h3 style={{ margin: 0 }}>Allegati</h3>
            <p style={{ margin: '4px 0', fontSize: 13, color: '#8B5E3C' }}>
              Moduli, planimetrie, menu, ecc.
            </p>
          </div>
          <button className="secondary" onClick={() => navigate(`/eventi/${id}/allegati`)}>
            Vai agli allegati
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Furgoni per il {new Date(evento.data_evento).toLocaleDateString('it-IT')}</h3>
        {(puoModificare ? furgoni : furgoni.filter(f => f.occupato_evento_id === Number(id))).map(f => {
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
              {puoModificare && occupatoDaAltri && (
                <span className="badge non_disponibile">Occupato su "{f.occupato_evento_nome}"</span>
              )}
              {!f.occupato_evento_id && puoModificare && (
                <button className="secondary" onClick={() => handleAssegnaFurgone(f.id)}>Assegna a questo evento</button>
              )}
            </div>
          );
        })}
        {puoModificare && furgoni.length === 0 && (
          <p>Nessun furgone in anagrafica. Aggiungili in <a href="/anagrafica">Anagrafica</a>.</p>
        )}
        {!puoModificare && furgoni.filter(f => f.occupato_evento_id === Number(id)).length === 0 && (
          <p style={{ color: '#8B5E3C', fontSize: 13 }}>Nessun furgone assegnato a questo evento.</p>
        )}
      </div>

      {puoModificare && (
        <GruppiEsterniCard
          richieste={gruppiRichieste}
          suggerimenti={suggerimentiGruppi}
          membriSquadra={evento.squadre[0]?.membri || []}
          squadraId={evento.squadre[0]?.id}
          onCrea={handleCreaRichiestaGruppo}
          onElimina={handleEliminaRichiestaGruppo}
          onAggiungiLista={handleAggiungiListaGruppo}
        />
      )}

      {evento.squadre.map(sq => (
        <SquadraCard
          key={sq.id}
          squadra={sq}
          lavoratori={lavoratori}
          puoModificare={puoModificare}
          gruppiRichieste={gruppiRichieste}
          onAggiungiMembro={handleAggiungiMembro}
          onAggiungiMembriMultipli={handleAggiungiMembriMultipli}
          onConfermaEInvia={handleConfermaEInvia}
          onRimuovi={async (membroId) => { await api.rimuoviMembro(membroId); carica(); }}
        />
      ))}
    </div>
  );
}

function GruppiEsterniCard({ richieste, suggerimenti, membriSquadra, squadraId, onCrea, onElimina, onAggiungiLista }) {
  const [nomeGruppo, setNomeGruppo] = useState('');
  const [numeroRichiesto, setNumeroRichiesto] = useState('');
  const [emailContatto, setEmailContatto] = useState('');
  const [puntoRitrovo, setPuntoRitrovo] = useState('sede');
  const [invio, setInvio] = useState(false);
  const [richiestaApertaId, setRichiestaApertaId] = useState(null);
  const [testoLista, setTestoLista] = useState('');
  const [invioLista, setInvioLista] = useState(false);

  const ETICHETTE_STATO_GRUPPO = {
    in_attesa_invio: 'In attesa di invio',
    inviata: 'Richiesta inviata',
    confermata: 'Confermata',
    rifiutata: 'Rifiutata'
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nomeGruppo || !numeroRichiesto) return;
    setInvio(true);
    const ok = await onCrea({
      nome_gruppo: nomeGruppo, numero_richiesto: Number(numeroRichiesto),
      email_contatto: emailContatto || null, punto_ritrovo: puntoRitrovo
    });
    setInvio(false);
    if (ok) { setNomeGruppo(''); setNumeroRichiesto(''); setEmailContatto(''); }
  }

  function contaNominativi(nomeGruppoRichiesta) {
    return membriSquadra.filter(m => m.gruppo === nomeGruppoRichiesta).length;
  }

  async function handleSubmitLista(richiesta) {
    const nomiValidi = testoLista.split('\n').map(r => r.trim()).filter(r => r.length > 0);
    if (nomiValidi.length === 0) return;
    setInvioLista(true);
    await onAggiungiLista(squadraId, testoLista, richiesta.nome_gruppo, richiesta.punto_ritrovo);
    setInvioLista(false);
    setTestoLista('');
    setRichiestaApertaId(null);
  }

  return (
    <div className="card">
      <h3>Gruppi esterni</h3>
      <p style={{ fontSize: 13, color: '#8B5E3C', marginTop: -8 }}>
        Segna quante persone ti servono da un gruppo esterno. La email parte con il comando "Richiedi disponibilità" nella vista settimanale. Quando ti rispondono con i nominativi, incollali qui sotto sulla stessa richiesta.
      </p>

      {richieste.map(r => (
        <div key={r.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
          <div className="row">
            <span>
              <strong>{r.nome_gruppo}</strong> — {contaNominativi(r.nome_gruppo)}/{r.numero_richiesto} persone inserite
              {r.email_contatto ? ` · ${r.email_contatto}` : ' · nessuna email, va comunicato a mano'}
              {' · ritrovo ' + (r.punto_ritrovo === 'location' ? 'in location' : 'in sede')}
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`badge ${r.stato === 'confermata' ? 'disponibile' : r.stato === 'rifiutata' ? 'non_disponibile' : 'in_attesa'}`}>
                {ETICHETTE_STATO_GRUPPO[r.stato] || r.stato}
              </span>
              <button className="secondary" onClick={() => { setRichiestaApertaId(richiestaApertaId === r.id ? null : r.id); setTestoLista(''); }}>
                {richiestaApertaId === r.id ? 'Annulla' : 'Aggiungi nominativi'}
              </button>
              <button className="danger" onClick={() => onElimina(r.id)}>Elimina</button>
            </div>
          </div>

          {richiestaApertaId === r.id && (
            <div style={{ marginTop: 10, paddingLeft: 4 }}>
              <p style={{ fontSize: 13, color: '#8B5E3C', margin: '0 0 6px' }}>
                Incolla qui i nominativi che ti manda {r.nome_gruppo} (un nome e cognome per riga) — risultano subito disponibili, senza email di richiesta:
              </p>
              <textarea
                placeholder={'Mario Rossi\nLuigi Bianchi\nAnna Verdi'}
                value={testoLista}
                onChange={e => setTestoLista(e.target.value)}
                rows={4}
              />
              <button className="secondary" disabled={invioLista || testoLista.trim().length === 0} onClick={() => handleSubmitLista(r)}>
                {invioLista ? 'Aggiungo...' : 'Aggiungi lista'}
              </button>
            </div>
          )}
        </div>
      ))}

      <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
        <div className="row">
          <input list="suggerimenti-gruppi" placeholder="Nome gruppo (es. Gruppo Samy)" value={nomeGruppo}
            onChange={e => setNomeGruppo(e.target.value)} style={{ marginBottom: 0 }} />
          <datalist id="suggerimenti-gruppi">
            {suggerimenti.map(g => <option key={g} value={g} />)}
          </datalist>
          <input type="number" min="1" placeholder="Numero persone" value={numeroRichiesto}
            onChange={e => setNumeroRichiesto(e.target.value)} style={{ marginBottom: 0, maxWidth: 140 }} />
        </div>
        <div className="row">
          <input type="email" placeholder="Email contatto gruppo (opzionale)" value={emailContatto}
            onChange={e => setEmailContatto(e.target.value)} style={{ marginBottom: 0 }} />
          <select value={puntoRitrovo} onChange={e => setPuntoRitrovo(e.target.value)} style={{ marginBottom: 0 }}>
            <option value="sede">Ritrovo in sede</option>
            <option value="location">Ritrovo in location</option>
          </select>
        </div>
        <button type="submit" disabled={invio}>{invio ? 'Salvo...' : 'Aggiungi richiesta'}</button>
      </form>
    </div>
  );
}

function SquadraCard({ squadra, lavoratori, puoModificare, gruppiRichieste, onAggiungiMembro, onAggiungiMembriMultipli, onConfermaEInvia, onRimuovi }) {
  const [selezionati, setSelezionati] = useState([]);

  const tuttiDisponibili = squadra.membri.length > 0 && squadra.membri.every(m => m.stato_disponibilita === 'disponibile');

  // Chi è già in squadra non compare più tra le opzioni selezionabili
  const idsGiaAggiunti = new Set(squadra.membri.map(m => m.lavoratore_id));
  const lavoratoriDisponibili = lavoratori.filter(l => !idsGiaAggiunti.has(l.id));

  // Richieste gruppo con ancora persone mancanti: compaiono come promemoria in fondo
  // alla lista, finché non vengono inserite tutte le persone richieste.
  const placeholderGruppi = (gruppiRichieste || [])
    .map(r => {
      const giaInseriti = squadra.membri.filter(m => m.gruppo === r.nome_gruppo).length;
      return { ...r, mancanti: r.numero_richiesto - giaInseriti };
    })
    .filter(r => r.mancanti > 0);

  function toggleSelezione(id) {
    setSelezionati(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function confermaAggiunta() {
    await onAggiungiMembriMultipli(squadra.id, selezionati, null, 'sede');
    setSelezionati([]);
  }

  return (
    <div className="card">
      <div className="row">
        <h3 style={{ margin: 0 }}>{squadra.nome}</h3>
        <span className="badge da_contattare">{squadra.stato}</span>
      </div>

      {squadra.membri.map(m => (
        <div key={m.id} className="row" style={{ padding: '6px 0', borderBottom: '1px solid #eee' }}>
          <span>{m.cognome} {m.nome} {m.ruolo_specifico ? `— ${m.ruolo_specifico}` : ''} <em style={{ color: '#999' }}>({m.mansione})</em>{m.gruppo ? <em style={{ color: 'var(--oro-scuro)' }}> · {m.gruppo}</em> : ''} <em style={{ color: '#999', fontSize: 12 }}> · ritrovo {m.punto_ritrovo === 'location' ? 'in location' : 'in sede'}</em></span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={`badge ${m.stato_disponibilita}`}>{ETICHETTE_STATO[m.stato_disponibilita]}</span>
            {puoModificare && <button className="danger" onClick={() => onRimuovi(m.id)}>Rimuovi</button>}
          </div>
        </div>
      ))}

      {placeholderGruppi.map(r => (
        <div key={`placeholder-${r.id}`} className="row" style={{ padding: '6px 0', borderBottom: '1px solid #eee', opacity: 0.7 }}>
          <span><em>{r.nome_gruppo} — {r.mancanti} {r.mancanti === 1 ? 'persona' : 'persone'} ancora da confermare</em></span>
          <span className="badge in_attesa">Da inserire</span>
        </div>
      ))}

      {squadra.membri.some(m => m.stato_disponibilita === 'da_contattare') && (
        <p style={{ fontSize: 13, color: '#8B5E3C', marginTop: 8 }}>
          Le richieste di disponibilità non si mandano più da qui: usa il pulsante "Richiedi disponibilità" nella vista settimanale degli eventi.
        </p>
      )}

      {puoModificare && (
        <>
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 13, color: '#8B5E3C', marginBottom: 6 }}>
              Seleziona uno o più lavoratori dello staff fisso da aggiungere (per i gruppi esterni usa la sezione "Gruppi esterni" qui sopra):
            </p>
            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4, padding: 8 }}>
              {lavoratoriDisponibili.map(l => {
                const occupato = Boolean(l.occupato_evento_id);
                return (
                  <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: occupato ? 'not-allowed' : 'pointer', opacity: occupato ? 0.6 : 1 }}>
                    <input type="checkbox" checked={selezionati.includes(l.id)} disabled={occupato}
                      onChange={() => toggleSelezione(l.id)} style={{ width: 'auto', marginBottom: 0 }} />
                    <span>{l.cognome} {l.nome} <em style={{ color: '#999' }}>({l.mansione})</em></span>
                    {occupato && (
                      <span className="badge non_disponibile" style={{ fontSize: 11 }}>
                        Occupato su "{l.occupato_evento_nome}"
                      </span>
                    )}
                  </label>
                );
              })}
              {lavoratoriDisponibili.length === 0 && (
                <p style={{ fontSize: 13, color: '#8B5E3C', margin: 0 }}>Tutti i lavoratori disponibili sono già stati aggiunti.</p>
              )}
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <span style={{ fontSize: 13, color: '#8B5E3C' }}>
                {selezionati.length} selezionat{selezionati.length === 1 ? 'o' : 'i'}
              </span>
              <button disabled={selezionati.length === 0} onClick={confermaAggiunta}>
                Aggiungi selezionati
              </button>
            </div>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <button disabled={!tuttiDisponibili} onClick={() => onConfermaEInvia(squadra.id)}>
              Conferma e invia al cliente
            </button>
          </div>
        </>
      )}
    </div>
  );
}
