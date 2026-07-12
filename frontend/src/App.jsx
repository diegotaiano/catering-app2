import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Eventi from './pages/Eventi.jsx';
import EventoDetail from './pages/EventoDetail.jsx';
import Anagrafica from './pages/Anagrafica.jsx';
import RispostaDisponibilita from './pages/RispostaDisponibilita.jsx';

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
      <Link to="/eventi"><strong>Rock Srl · Gestione Squadre</strong></Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/anagrafica">Anagrafica</Link>
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
        <Route path="/eventi" element={<RottaProtetta><Eventi /></RottaProtetta>} />
        <Route path="/eventi/:id" element={<RottaProtetta><EventoDetail /></RottaProtetta>} />
        <Route path="/anagrafica" element={<RottaProtetta><Anagrafica /></RottaProtetta>} />
        <Route path="*" element={<Navigate to="/eventi" replace />} />
      </Routes>
    </>
  );
}
