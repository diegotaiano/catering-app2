import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Eventi from './pages/Eventi.jsx';
import EventoDetail from './pages/EventoDetail.jsx';
import AllegatiEvento from './pages/AllegatiEvento.jsx';
import Anagrafica from './pages/Anagrafica.jsx';
import Cestino from './pages/Cestino.jsx';
import RispostaDisponibilita from './pages/RispostaDisponibilita.jsx';
import GruppoRisposta from './pages/GruppoRisposta.jsx';
import { haAccessoCompleto } from './ruoli.js';

function RottaProtetta({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function TopBar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const utente = JSON.parse(localStorage.getItem('utente') || 'null');
  if (!token) return null;

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('utente');
    navigate('/login');
  }

  return (
    <div className="top-bar">
      <Link to="/eventi" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <img src="/logo-shield-gold.png" alt="Lanzarotti 1967" style={{ height: 34 }} />
        <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--oro-chiaro)' }}>
          Lanzarotti 1967 <span style={{ opacity: 0.7, fontWeight: 600 }}>· Gestione Eventi</span>
        </span>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/anagrafica">Anagrafica</Link>
        {haAccessoCompleto(utente) && <Link to="/cestino">Cestino</Link>}
        {utente && <span>{utente.nome} {utente.cognome}</span>}
        <button onClick={logout}>Esci</button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <TopBar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/disponibilita/:token" element={<RispostaDisponibilita />} />
        <Route path="/gruppo-risposta/:token" element={<GruppoRisposta />} />
        <Route path="/eventi" element={<RottaProtetta><Eventi /></RottaProtetta>} />
        <Route path="/eventi/:id" element={<RottaProtetta><EventoDetail /></RottaProtetta>} />
        <Route path="/eventi/:id/allegati" element={<RottaProtetta><AllegatiEvento /></RottaProtetta>} />
        <Route path="/anagrafica" element={<RottaProtetta><Anagrafica /></RottaProtetta>} />
        <Route path="/cestino" element={<RottaProtetta><Cestino /></RottaProtetta>} />
        <Route path="*" element={<Navigate to="/eventi" replace />} />
      </Routes>
    </>
  );
}
