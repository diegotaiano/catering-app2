import { useState, useRef, useEffect } from 'react';

// Campo di testo con suggerimenti di indirizzo mentre si digita (tipo Google Maps),
// usando il servizio gratuito di ricerca di OpenStreetMap (Nominatim). Nessuna chiave
// API richiesta.
export default function CampoIndirizzo({ value, onChange, placeholder }) {
  const [suggerimenti, setSuggerimenti] = useState([]);
  const [mostraLista, setMostraLista] = useState(false);
  const [caricando, setCaricando] = useState(false);
  const timerRef = useRef(null);
  const contenitoreRef = useRef(null);

  useEffect(() => {
    function chiudiSeFuori(e) {
      if (contenitoreRef.current && !contenitoreRef.current.contains(e.target)) {
        setMostraLista(false);
      }
    }
    document.addEventListener('mousedown', chiudiSeFuori);
    return () => document.removeEventListener('mousedown', chiudiSeFuori);
  }, []);

  function handleChange(e) {
    const testo = e.target.value;
    onChange(testo);

    clearTimeout(timerRef.current);
    if (testo.trim().length < 3) {
      setSuggerimenti([]);
      setMostraLista(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setCaricando(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=5&countrycodes=it&q=${encodeURIComponent(testo)}`
        );
        const dati = await res.json();
        setSuggerimenti(dati);
        setMostraLista(true);
      } catch {
        setSuggerimenti([]);
      } finally {
        setCaricando(false);
      }
    }, 400);
  }

  function scegliSuggerimento(s) {
    onChange(s.display_name);
    setSuggerimenti([]);
    setMostraLista(false);
  }

  return (
    <div ref={contenitoreRef} style={{ position: 'relative' }}>
      <input
        placeholder={placeholder || 'Luogo'}
        value={value}
        onChange={handleChange}
        onFocus={() => { if (suggerimenti.length > 0) setMostraLista(true); }}
        autoComplete="off"
      />
      {mostraLista && (suggerimenti.length > 0 || caricando) && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          background: '#fff', border: '1px solid var(--avorio-scuro)', borderRadius: 2,
          boxShadow: '0 4px 10px rgba(35,32,33,0.12)', marginTop: -6, maxHeight: 220, overflowY: 'auto'
        }}>
          {caricando && <div style={{ padding: '8px 12px', fontSize: 13, color: '#8B5E3C' }}>Cerco...</div>}
          {!caricando && suggerimenti.map((s, i) => (
            <div
              key={i}
              onClick={() => scegliSuggerimento(s)}
              style={{ padding: '8px 12px', fontSize: 14, cursor: 'pointer', borderBottom: i < suggerimenti.length - 1 ? '1px solid #f0ece0' : 'none' }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {s.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
