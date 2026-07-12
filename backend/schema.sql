-- ============================================================
-- SCHEMA: Modulo Squadre & Disponibilità - Rock Srl Catering
-- ============================================================

-- Responsabili di servizio (unici utenti con login/frontend)
CREATE TABLE IF NOT EXISTS utenti (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cognome VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  ruolo VARCHAR(30) NOT NULL DEFAULT 'responsabile_servizio', -- responsabile_servizio | admin | capisquadra (futuro)
  attivo BOOLEAN NOT NULL DEFAULT true,
  creato_il TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Anagrafica lavoratori (camerieri, baristi, cuochi...) - NIENTE login
CREATE TABLE IF NOT EXISTS lavoratori (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cognome VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telefono VARCHAR(30),
  mansione VARCHAR(50), -- cameriere | barista | cuoco | plonge | chef_di_rango ecc.
  note TEXT,
  attivo BOOLEAN NOT NULL DEFAULT true,
  creato_il TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Referenti commerciali/cliente (chi riceve la lista squadra finale)
CREATE TABLE IF NOT EXISTS referenti_commerciali (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cognome VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  attivo BOOLEAN NOT NULL DEFAULT true
);

-- Eventi
CREATE TABLE IF NOT EXISTS eventi (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,          -- es. "Matrimonio Rossi-Bianchi"
  brand VARCHAR(50),                    -- Lanzarotti1967 | SportCatering
  cliente VARCHAR(255),
  luogo VARCHAR(255),
  data_evento DATE NOT NULL,
  ora_partenza_sede TIME,               -- ora partenza mezzi/staff dalla sede
  ora_ritrovo_location TIME,            -- ora ritrovo staff sul posto
  ora_inizio TIME,                       -- orario inizio servizio
  ora_fine TIME,                         -- orario fine servizio
  numero_ospiti INTEGER,
  referente_commerciale_id INTEGER REFERENCES referenti_commerciali(id),
  responsabile_servizio_id INTEGER REFERENCES utenti(id),
  stato VARCHAR(30) NOT NULL DEFAULT 'in_organizzazione', -- in_organizzazione | confermato | concluso | annullato
  note TEXT,
  creato_il TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Squadre (una o più per evento, es. "Sala", "Cucina", "Bar")
CREATE TABLE IF NOT EXISTS squadre (
  id SERIAL PRIMARY KEY,
  evento_id INTEGER NOT NULL REFERENCES eventi(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,           -- "Sala", "Cucina", "Bar", "Facchinaggio"
  stato VARCHAR(30) NOT NULL DEFAULT 'bozza', -- bozza | in_attesa_risposte | completa | inviata_al_cliente
  creata_da INTEGER REFERENCES utenti(id),
  creata_il TIMESTAMPTZ NOT NULL DEFAULT now(),
  confermata_il TIMESTAMPTZ,
  inviata_il TIMESTAMPTZ
);

-- Membri squadra + stato disponibilità (cuore del modulo)
CREATE TABLE IF NOT EXISTS squadra_membri (
  id SERIAL PRIMARY KEY,
  squadra_id INTEGER NOT NULL REFERENCES squadre(id) ON DELETE CASCADE,
  lavoratore_id INTEGER NOT NULL REFERENCES lavoratori(id),
  ruolo_specifico VARCHAR(100),         -- es. "Capo sala", "Cameriere", "Runner"
  stato_disponibilita VARCHAR(30) NOT NULL DEFAULT 'da_contattare',
    -- da_contattare | in_attesa | disponibile | non_disponibile
  token_risposta VARCHAR(64) UNIQUE,    -- token magic-link
  token_scadenza TIMESTAMPTZ,
  email_inviata_il TIMESTAMPTZ,
  risposta_il TIMESTAMPTZ,
  note_lavoratore TEXT,                 -- eventuale motivo indisponibilità
  UNIQUE (squadra_id, lavoratore_id)
);

CREATE INDEX IF NOT EXISTS idx_squadra_membri_token ON squadra_membri(token_risposta);
CREATE INDEX IF NOT EXISTS idx_squadre_evento ON squadre(evento_id);
CREATE INDEX IF NOT EXISTS idx_eventi_data ON eventi(data_evento);

-- ============================================================
-- Modulo Furgoni
-- ============================================================

-- Anagrafica mezzi
CREATE TABLE IF NOT EXISTS furgoni (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,     -- es. "Furgone 1 - Fiat Ducato"
  targa VARCHAR(20),
  note TEXT,
  attivo BOOLEAN NOT NULL DEFAULT true,
  creato_il TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assegnazione furgone a un evento per una data specifica.
-- Il vincolo UNIQUE(furgone_id, data) impedisce di assegnare
-- lo stesso furgone a due eventi nello stesso giorno.
CREATE TABLE IF NOT EXISTS furgone_assegnazioni (
  id SERIAL PRIMARY KEY,
  furgone_id INTEGER NOT NULL REFERENCES furgoni(id),
  evento_id INTEGER NOT NULL REFERENCES eventi(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  assegnato_da INTEGER REFERENCES utenti(id),
  creato_il TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (furgone_id, data)
);

CREATE INDEX IF NOT EXISTS idx_furgone_assegnazioni_data ON furgone_assegnazioni(data);
CREATE INDEX IF NOT EXISTS idx_furgone_assegnazioni_evento ON furgone_assegnazioni(evento_id);

-- Se lo schema era già stato applicato in precedenza (prima di questi due campi),
-- questa riga li aggiunge senza toccare nient'altro. Se il database è nuovo,
-- questi campi sono già nella CREATE TABLE eventi qui sopra e questa riga è un no-op.
ALTER TABLE eventi ADD COLUMN IF NOT EXISTS ora_partenza_sede TIME;
ALTER TABLE eventi ADD COLUMN IF NOT EXISTS ora_ritrovo_location TIME;

-- Capo servizio: la persona assegnata a gestire QUESTO evento sul campo
-- (distinto da responsabile_servizio_id, che e' semplicemente chi ha creato la scheda)
ALTER TABLE eventi ADD COLUMN IF NOT EXISTS capo_servizio_id INTEGER REFERENCES utenti(id);

-- Collega un utente con ruolo 'referente_commerciale' alla riga corrispondente
-- in referenti_commerciali, cosi' il suo accesso si puo' filtrare sui soli eventi
-- di cui e' il referente. Non utilizzato per gli altri ruoli.
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS referente_commerciale_id INTEGER REFERENCES referenti_commerciali(id);

-- Cestino: gli eventi eliminati non vengono cancellati subito, solo marcati.
-- NULL = evento attivo, valorizzato = eliminato (recuperabile) in quel momento.
ALTER TABLE eventi ADD COLUMN IF NOT EXISTS eliminato_il TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_eventi_eliminato ON eventi(eliminato_il);
