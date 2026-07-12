import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';

export default function RispostaDisponibilita() {
  const { token } = useParams();
  const [richiesta, setRichiesta] = useState(null);
  const [errore, setErrore] = useState(null);
  const [note, setNote] = useState('');
  const [inviato, setInviato] = useState(null);

  useEffect(() => {
    api.getRichiestaDisponibilita(token)
      .then(setRichiesta)
      .catch(err => setErrore(err.message));
  }, [token]);

  async function rispondi(disponibile) {
    try {
      const res = await api.rispondiDisponibilita(token, disponibile, note);
      setInviato(res.stato);
    } catch (err) {
      setErrore(err.message);
    }
  }

  if (errore) return <div className="container" style={{ maxWidth: 480 }}><div className="card">{errore}</div></div>;
  if (!richiesta) return <div className="container">Caricamento...</div>;

  if (inviato) {
    return (
      <div className="container" style={{ maxWidth: 480, marginTop: 60 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h2>Grazie {richiesta.nome}!</h2>
          <p>Hai risposto: <strong>{inviato === 'disponibile' ? 'Disponibile' : 'Non disponibile'}</strong></p>
          <p style={{ color: '#8B5E3C' }}>La tua risposta è stata registrata.</p>
        </div>
      </div>
    );
  }

  const dataFormattata = new Date(richiesta.data_evento).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="container" style={{ maxWidth: 480, marginTop: 40 }}>
      <div className="card">
        <h2>Ciao {richiesta.nome},</h2>
        <p>Ti proponiamo per questo evento:</p>
        <table style={{ width: '100%', marginBottom: 16 }}>
          <tbody>
            <tr><td><strong>Evento:</strong></td><td>{richiesta.evento_nome}</td></tr>
            <tr><td><strong>Data:</strong></td><td>{dataFormattata}</td></tr>
            <tr><td><strong>Luogo:</strong></td><td>{richiesta.luogo || '-'}</td></tr>
            {richiesta.ora_partenza_sede && <tr><td><strong>Partenza da sede:</strong></td><td>{richiesta.ora_partenza_sede.slice(0,5)}</td></tr>}
            {richiesta.ora_ritrovo_location && <tr><td><strong>Ritrovo in location:</strong></td><td>{richiesta.ora_ritrovo_location.slice(0,5)}</td></tr>}
            {richiesta.ora_inizio && <tr><td><strong>Inizio servizio:</strong></td><td>{richiesta.ora_inizio.slice(0,5)}</td></tr>}
            <tr><td><strong>Ruolo:</strong></td><td>{richiesta.ruolo_specifico || '-'}</td></tr>
          </tbody>
        </table>
        <textarea placeholder="Note (opzionale)" value={note} onChange={e => setNote(e.target.value)} rows={2} />
        <div className="row">
          <button onClick={() => rispondi(true)}>Sono disponibile</button>
          <button className="danger" onClick={() => rispondi(false)}>Non disponibile</button>
        </div>
      </div>
    </div>
  );
}
