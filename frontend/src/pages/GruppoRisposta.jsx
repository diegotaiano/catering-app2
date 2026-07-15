import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';

export default function GruppoRisposta() {
  const { token } = useParams();
  const [richiesta, setRichiesta] = useState(null);
  const [errore, setErrore] = useState(null);
  const [inviato, setInviato] = useState(null);

  useEffect(() => {
    api.getRichiestaGruppo(token)
      .then(setRichiesta)
      .catch(err => setErrore(err.message));
  }, [token]);

  async function rispondi(confermato) {
    try {
      const res = await api.rispondiGruppo(token, confermato);
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
          <h2>Grazie!</h2>
          <p>Avete risposto: <strong>{inviato === 'confermata' ? 'Confermato' : 'Non disponibile'}</strong></p>
          <p style={{ color: '#8B5E3C' }}>La risposta è stata registrata. Se confermato, mandateci poi i nominativi per email o telefono.</p>
        </div>
      </div>
    );
  }

  const dataFormattata = new Date(richiesta.data_evento).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  const inSede = richiesta.punto_ritrovo !== 'location';
  const orario = inSede ? richiesta.ora_partenza_sede : richiesta.ora_ritrovo_location;

  return (
    <div className="container" style={{ maxWidth: 480, marginTop: 40 }}>
      <div className="card">
        <h2>Richiesta personale — {richiesta.nome_gruppo}</h2>
        <p>Per questo evento ci servirebbero <strong>{richiesta.numero_richiesto}</strong> persone:</p>
        <table style={{ width: '100%', marginBottom: 16 }}>
          <tbody>
            <tr><td><strong>Evento:</strong></td><td>{richiesta.evento_nome}</td></tr>
            <tr><td><strong>Data:</strong></td><td>{dataFormattata}</td></tr>
            <tr><td><strong>Ritrovo:</strong></td><td>{orario ? orario.slice(0, 5) : 'da definire'} {inSede ? 'in sede' : 'in location'}</td></tr>
            <tr><td><strong>Location evento:</strong></td><td>{richiesta.luogo || '-'}</td></tr>
          </tbody>
        </table>
        <div className="row">
          <button onClick={() => rispondi(true)}>Confermiamo</button>
          <button className="danger" onClick={() => rispondi(false)}>Non disponibili</button>
        </div>
      </div>
    </div>
  );
}
