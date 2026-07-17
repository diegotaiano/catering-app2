import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { haAccessoCompleto } from '../ruoli.js';

function formattaDimensione(byte) {
  if (!byte) return '0 KB';
  if (byte < 1024 * 1024) return `${Math.round(byte / 1024)} KB`;
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AllegatiEvento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const utente = JSON.parse(localStorage.getItem('utente') || 'null');
  const puoModificare = haAccessoCompleto(utente);

  const [evento, setEvento] = useState(null);
  const [allegati, setAllegati] = useState([]);
  const [caricando, setCaricando] = useState(false);
  const [messaggio, setMessaggio] = useState(null);

  async function carica() {
    try {
      const [ev, al] = await Promise.all([api.getEvento(id), api.getAllegati(id)]);
      setEvento(ev);
      setAllegati(al);
    } catch (err) {
      setMessaggio(`Errore: ${err.message}`);
    }
  }
  useEffect(() => { carica(); }, [id]);

  async function handleCarica(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setCaricando(true);
    setMessaggio(null);
    try {
      await api.caricaAllegati(id, files);
      setAllegati(await api.getAllegati(id));
    } catch (err) {
      setMessaggio(`Errore: ${err.message}`);
    } finally {
      setCaricando(false);
      e.target.value = '';
    }
  }

  async function handleScarica(allegato) {
    try {
      await api.scaricaAllegato(id, allegato.id, allegato.nome_file);
    } catch (err) {
      setMessaggio(`Errore: ${err.message}`);
    }
  }

  async function handleElimina(allegato) {
    if (!confirm(`Eliminare l'allegato "${allegato.nome_file}"?`)) return;
    await api.eliminaAllegato(id, allegato.id);
    setAllegati(await api.getAllegati(id));
  }

  if (!evento) return <div className="container">Caricamento...</div>;

  return (
    <div className="container">
      <span onClick={() => navigate(`/eventi/${id}`)} style={{ cursor: 'pointer', fontSize: 13, color: 'var(--oro-scuro)' }}>
        &larr; Torna a {evento.nome}
      </span>
      <h1 style={{ marginTop: 8 }}>Allegati</h1>
      <p style={{ color: '#8B5E3C', marginTop: -8, marginBottom: 20 }}>
        {evento.nome} · {new Date(evento.data_evento).toLocaleDateString('it-IT')}
      </p>

      {messaggio && <div className="card" style={{ background: '#fdf1d6' }}>{messaggio}</div>}

      <div className="card">
        <p style={{ fontSize: 13, color: '#8B5E3C', marginTop: 0 }}>
          Moduli, planimetrie, menu, ecc. Le immagini e i PDF vengono incorporati anche nel PDF scaricabile della scheda servizio.
        </p>

        {allegati.map(a => (
          <div key={a.id} className="row" style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <span onClick={() => handleScarica(a)} style={{ cursor: 'pointer', color: 'var(--oro-scuro)' }}>
              {a.nome_file} <span style={{ color: '#999', fontSize: 12 }}>({formattaDimensione(a.dimensione_byte)})</span>
            </span>
            {puoModificare && (
              <button className="danger" onClick={() => handleElimina(a)}>Elimina</button>
            )}
          </div>
        ))}
        {allegati.length === 0 && <p style={{ color: '#8B5E3C', fontSize: 13 }}>Nessun allegato caricato.</p>}

        {puoModificare && (
          <div style={{ marginTop: 16 }}>
            <input type="file" multiple onChange={handleCarica} disabled={caricando} />
            {caricando && <p style={{ fontSize: 13, color: '#8B5E3C' }}>Caricamento in corso...</p>}
          </div>
        )}
      </div>

      <p>
        <Link to={`/eventi/${id}`} style={{ color: 'var(--oro-scuro)' }}>&larr; Torna alla scheda evento</Link>
      </p>
    </div>
  );
}
