# Rock Srl Catering — Modulo Squadre & Disponibilità

Primo modulo del gestionale catering: creazione squadre per evento, invio richieste
di disponibilità ai lavoratori via email (link magico, nessun login richiesto),
raccolta risposte e invio automatico della lista squadra finale al referente commerciale.

## Struttura

```
catering-app/
  backend/    Node.js + Express + PostgreSQL (API)
  frontend/   React + Vite (dashboard responsabile di servizio + pagina pubblica lavoratore)
```

## Chi accede a cosa

- **HR Manager**: pieno accesso — crea/modifica eventi, squadre, furgoni, anagrafica, utenti. Vede tutti gli eventi.
- **Amministrazione** / **Commerciale**: sola lettura, ma vedono **tutti** gli eventi.
- **Referente commerciale**: sola lettura, vede **solo** gli eventi di cui è il referente commerciale assegnato (va collegato a una riga dell'anagrafica Referenti commerciali quando si crea l'utente).
- **Capo servizio**: sola lettura, vede **solo** gli eventi a cui è stato assegnato come capo servizio (campo impostabile in creazione/modifica evento).
- **Lavoratori**: nessun account. Ricevono una email con un link univoco e rispondono
  Disponibile/Non disponibile senza autenticarsi.

I nuovi utenti si creano direttamente dall'app, in Anagrafica → "Utenti app" (visibile solo a chi ha già accesso completo).

## Cestino

Eliminare un evento non lo cancella subito: lo sposta in un cestino (visibile solo a chi ha accesso completo, link "Cestino" in alto), da cui può essere ripristinato in qualsiasi momento oppure eliminato in modo definitivo e irreversibile.

## Allegati

Nella scheda di ogni evento (e già in fase di creazione) si possono caricare file — moduli, planimetrie, menu, ecc. Solo chi ha accesso completo può caricarli o eliminarli; tutti i ruoli che vedono l'evento possono scaricarli. I file sono salvati direttamente nel database (non serve configurare uno storage esterno), quindi sono adatti a documenti e immagini di dimensione ragionevole (limite 15MB per file).

Il PDF "scheda servizio" incorpora automaticamente immagini e PDF allegati come pagine aggiuntive; altri formati (es. Word, Excel) restano elencati per nome e scaricabili singolarmente dall'app.

## Richiesta disponibilità settimanale

Le email di richiesta disponibilità (sia ai lavoratori singoli sia ai gruppi esterni) non partono più subito quando aggiungi qualcuno a una squadra o crei una richiesta gruppo: restano "in attesa" finché l'HR Manager non lancia l'invio.

Nella pagina Eventi, gli eventi futuri sono raggruppati per settimana (lunedì-domenica). In fondo a ogni settimana c'è un pulsante **"Richiedi disponibilità"**: un click manda **una sola email per persona/gruppo**, con tutti i loro eventi di quella settimana elencati (data, orario e punto di ritrovo — sede o location —, location dell'evento), ciascuno con il proprio link di conferma indipendente.

Quando aggiungi qualcuno a una squadra, scegli anche il suo **punto di ritrovo** (sede o location): determina quale orario dell'evento (partenza sede / ritrovo location) compare nella sua email.

## Setup Database (Neon o altro Postgres)

1. Crea un progetto su [neon.tech](https://neon.tech) (o riusa quello esistente, creando
   queste tabelle in aggiunta alle tue — non ci sono conflitti di nomi con l'app ore-staff).
2. Copia la connection string.
3. Nel backend:
   ```
   cd backend
   cp .env.example .env
   # incolla DATABASE_URL nel file .env
   npm install
   npm run migrate    # applica schema.sql
   ```
4. Crea il primo utente responsabile di servizio:
   ```
   node src/seed-utente.js "Diego" "Taiano" "diego@rocksrl.it" "una-password-sicura"
   ```

## Setup Email (Resend)

1. Su [resend.com](https://resend.com) verifica il tuo dominio (o usa il dominio di test in sviluppo).
2. Copia la API key in `RESEND_API_KEY` nel file `.env`.
3. Imposta `EMAIL_FROM` con un indirizzo del dominio verificato.
4. Imposta `FRONTEND_PUBLIC_URL` con l'URL pubblico del frontend (es. quello di Render/Vercel),
   perché è quello che viene inserito nei link delle email.

## Avvio in locale

```
# Backend
cd backend
npm install
npm run dev          # http://localhost:3001

# Frontend (altro terminale)
cd frontend
npm install
npm run dev           # http://localhost:5173
```

## Deploy (stesso schema già usato per l'app ore-staff)

- **Backend**: Render (Web Service) — build command `npm install`, start command `npm start`,
  variabili d'ambiente come da `.env.example`.
- **Frontend**: Render (Static Site) o Vercel — build command `npm run build`, publish directory `dist`,
  variabile `VITE_API_URL` puntata all'URL del backend (es. `https://tuobackend.onrender.com/api`).
- **Database**: Neon (già in uso).

## Dati mancanti da inserire prima dell'uso

Prima di creare un evento serve almeno:
- qualche riga in `lavoratori` (anagrafica squadra)
- qualche riga in `referenti_commerciali` (chi riceve la lista finale)

Non c'è ancora un'interfaccia per gestirli da frontend — per ora si inseriscono
via SQL diretto su Neon, oppure te la aggiungo come prossimo pezzetto se vuoi.

## Prossimi moduli (non ancora implementati)

- Assegnazione furgoni (con blocco disponibilità giorno)
- Ore staff su eventi catering
- Scelta vini da parte di sposi/clienti
- Scheda evento con upload file (moduli, planimetrie, menu)
