import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Cestino() {
  const [eventi, setEventi] = useState([]);
  const [caricato, setCaricato] = useState(false);

  async function carica() {
    setEventi(await api.getEventiCestino());
    setCaricato(true);
  }
  useEffect(() => { carica(); }, []);

  async function ripristina(ev) {
    await api.ripristinaEvento(ev.id);
    carica();
  }

  async function eliminaDefinitivamente(ev) {
    if (!confirm(`Eliminare DEFINITIVAMENTE "${ev.nome}"? Non sarà più recuperabile in nessun modo.`)) return;
    await api.eliminaDefinitivamente(ev.id);
    carica();
  }

  return (
    <div className="container">
      <h1>Cestino</h1>
      <p style={{ color: '#8B5E3C', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Gli eventi eliminati restano qui, recuperabili in qualsiasi momento, finché non li elimini definitivamente.
      </p>

      {eventi.map(ev => (
        <div key={ev.id} className="card">
          <div className="row">
            <div>
              <h3 style={{ margin: 0 }}>{ev.nome}</h3>
              <p style={{ margin: '4px 0', color: '#8B5E3C' }}>
                {new Date(ev.data_evento).toLocaleDateString('it-IT')} · {ev.luogo || 'luogo da definire'}
                {ev.referente_nome ? ` · Referente: ${ev.referente_nome} ${ev.referente_cognome}` : ''}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#a33' }}>
                Eliminato il {new Date(ev.eliminato_il).toLocaleDateString('it-IT')} alle {new Date(ev.eliminato_il).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="secondary" onClick={() => ripristina(ev)}>Ripristina</button>
              <button className="danger" onClick={() => eliminaDefinitivamente(ev)}>Elimina definitivamente</button>
            </div>
          </div>
        </div>
      ))}

      {caricato && eventi.length === 0 && <p>Il cestino è vuoto.</p>}

      <p style={{ marginTop: 24 }}>
        <Link to="/eventi" style={{ color: 'var(--oro-scuro)' }}>&larr; Torna agli eventi</Link>
      </p>
    </div>
  );
}
