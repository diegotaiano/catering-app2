import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErrore(null);
    try {
      const data = await api.login(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('utente', JSON.stringify(data.utente));
      navigate('/eventi');
    } catch (err) {
      setErrore(err.message);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 380, marginTop: 60 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <img src="/logo-shield-gold.png" alt="Lanzarotti 1967" style={{ height: 90 }} />
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 20, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--nero)', marginTop: 8 }}>
          Lanzarotti <span style={{ color: 'var(--oro)' }}>1967</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--grigio-testo)', letterSpacing: '0.05em', marginTop: 2 }}>Gestione Squadre</div>
      </div>
      <div className="card">
        <h2>Accesso Responsabile di Servizio</h2>
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          {errore && <p style={{ color: '#a33' }}>{errore}</p>}
          <button type="submit">Accedi</button>
        </form>
      </div>
    </div>
  );
}
