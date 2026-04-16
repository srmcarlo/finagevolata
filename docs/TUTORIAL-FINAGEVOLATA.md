# Tutorial FinAgevolata - Guida Completa alla Piattaforma

## Indice

1. [Panoramica](#1-panoramica)
2. [Accesso e Registrazione](#2-accesso-e-registrazione)
3. [Portale Admin](#3-portale-admin)
4. [Portale Consulente](#4-portale-consulente)
5. [Portale Azienda](#5-portale-azienda)
6. [Flusso Completo: dalla registrazione al Click Day](#6-flusso-completo)

---

## 1. Panoramica

FinAgevolata collega **consulenti di finanza agevolata** e **aziende italiane** che vogliono accedere a bandi pubblici (MISE, Invitalia, Regioni, INAIL, PNRR).

La piattaforma gestisce il ciclo completo:

```
Bando pubblicato → Matching con aziende → Pratica aperta →
Checklist documenti generata → Azienda carica documenti →
Consulente revisiona → Pratica pronta → Export Click Day
```

### Tre portali, un unico sistema

| Portale | Utente | Cosa fa |
|---------|--------|---------|
| **Admin** | Operatore piattaforma | Pubblica bandi, approva proposte, gestisce utenti |
| **Consulente** | Studio/freelance | Gestisce clienti, apre pratiche, revisiona documenti |
| **Azienda** | PMI/impresa | Vede bandi compatibili, carica documenti, monitora stato |

---

## 2. Accesso e Registrazione

### 2.1 Login

Vai su `http://localhost:3000` (o il dominio di produzione).

- **Email** e **Password**
- Il sistema reindirizza automaticamente al portale corretto in base al ruolo

### 2.2 Registrazione nuovo utente

Dalla pagina di login, clicca **"Registrati"**.

Compila:
- **Nome completo**
- **Email**
- **Password** (minimo 8 caratteri)
- **Ruolo**: scegli tra **Consulente** o **Azienda**

> L'account Admin non si crea dalla registrazione pubblica. Viene creato direttamente nel sistema.

### 2.3 Onboarding Azienda

Dopo la registrazione come **Azienda**, il sistema chiede di completare il profilo aziendale:

| Campo | Esempio | Note |
|-------|---------|------|
| Partita IVA | 01234567890 | Esattamente 11 cifre |
| Ragione Sociale | Rossi Costruzioni SRL | Nome ufficiale |
| Forma Giuridica | SRL | Dropdown: SRL, SRLS, SPA, SNC, SAS, Ditta Individuale, Cooperativa |
| Dimensione | Piccola (10-49) | Micro, Piccola, Media, Grande |
| Codice ATECO | 41.20 | Codice attivita economica |
| Descrizione ATECO | Costruzione edifici | Descrizione dell'attivita |
| Regione | Lombardia | Dropdown 20 regioni italiane |
| Provincia | MI | Sigla 2 lettere |

Questi dati sono fondamentali: il sistema li usa per il **matching automatico con i bandi compatibili**.

---

## 3. Portale Admin

**Accesso demo:** `admin@finagevolata.it` / `admin123456`

### 3.1 Dashboard Admin

La dashboard mostra 4 KPI in tempo reale:

- **Utenti totali** — quanti utenti registrati sulla piattaforma
- **Bandi attivi** — bandi pubblicati e visibili
- **Pratiche totali** — tutte le pratiche aperte nel sistema
- **Bandi da approvare** — proposte dei consulenti in attesa di revisione

### 3.2 Gestione Bandi

L'admin puo:

**Creare un nuovo bando** compilando:

| Campo | Descrizione |
|-------|-------------|
| Titolo | Nome del bando (es. "Bando Macchinari Innovativi 2025") |
| Descrizione | Dettagli del bando |
| Ente Emittente | Chi lo pubblica (es. MISE, Regione Lombardia, INAIL) |
| Tipologia | Fondo Perduto / Finanziamento Agevolato / Credito d'Imposta / Garanzia |
| Importo Massimo | Tetto massimo del contributo in EUR |
| Scadenza | Data di chiusura per le domande |
| Codici ATECO ammessi | Lista separata da virgola (es. "41.20, 43.21, 25.11") |
| URL Fonte | Link al bando ufficiale |
| Click Day | Se il bando prevede la procedura Click Day |

**Approvare proposte** dei consulenti:
- I consulenti possono proporre bandi come bozza
- L'admin li revisiona e clicca **"Approva"** per pubblicarli

**Visualizzare tutti i bandi** con stato:
- **Pubblicato** (verde) — visibile a consulenti e aziende
- **Bozza** (giallo) — in attesa di approvazione
- **Chiuso** (grigio) — scaduto

### 3.3 Gestione Utenti

Tabella con tutti gli utenti registrati:

| Colonna | Dettaglio |
|---------|-----------|
| Nome | Nome completo |
| Email | Email di registrazione |
| Ruolo | Admin (viola) / Consulente (blu) / Azienda (verde) |
| Azienda/Studio | Ragione sociale o nome studio |
| Pratiche | Numero totale pratiche associate |
| Data registrazione | Quando si e registrato |

---

## 4. Portale Consulente

### 4.1 Dashboard Consulente

Tre metriche principali:

- **Clienti attivi** — aziende collegate e attive
- **Pratiche** — totale pratiche in gestione
- **Documenti da revisionare** — documenti caricati dalle aziende che attendono revisione

### 4.2 Gestione Clienti

#### Invitare un'azienda

1. Nella sezione **Clienti**, inserisci l'email dell'azienda
2. Clicca **"Invita"**
3. L'azienda riceve un invito e puo registrarsi
4. Lo stato passa da **In attesa** (giallo) ad **Attivo** (verde) quando l'azienda accetta

#### Tabella clienti

Mostra per ogni azienda:
- Ragione sociale
- Partita IVA
- Regione
- Stato della relazione (Attivo / In attesa / Revocato)

### 4.3 Gestione Bandi

Il consulente puo:

- **Visualizzare tutti i bandi** pubblicati sulla piattaforma
- **Proporre un nuovo bando** come bozza (l'admin dovra approvarlo)

Questo permette ai consulenti esperti di segnalare bandi che l'admin potrebbe non conoscere.

### 4.4 Gestione Pratiche

Questa e la sezione principale del lavoro quotidiano del consulente.

#### Creare una nuova pratica

1. Seleziona un **Bando** dal dropdown (solo bandi pubblicati)
2. Seleziona un **Cliente** dal dropdown (solo clienti attivi)
3. Clicca **"Crea Pratica"**

> Il sistema genera automaticamente la **checklist documenti** basata sui requisiti del bando. Ogni documento richiesto dal bando diventa un item nella checklist della pratica.

#### Dettaglio pratica

La pagina di dettaglio mostra:

**Informazioni bando:**
- Titolo, ente emittente, scadenza, importo massimo

**Informazioni azienda:**
- Ragione sociale, P.IVA, regione, consulente assegnato

**Checklist documenti:**
- Lista di tutti i documenti richiesti
- Stato di ciascun documento con barra di avanzamento:
  - Mancante (da caricare)
  - Caricato (in attesa di revisione)
  - Approvato (confermato dal consulente)
  - Rifiutato (con motivazione, da ricaricare)

**Aggiornamento stato pratica:**

Il consulente puo aggiornare lo stato della pratica attraverso il suo ciclo di vita:

```
Documenti in attesa → In revisione → Pronta per invio → Inviata → Vinta/Persa
```

| Stato | Significato |
|-------|-------------|
| Documenti in attesa | L'azienda deve ancora caricare i documenti |
| In revisione | Il consulente sta verificando i documenti |
| Pronta per invio | Tutti i documenti approvati, pratica compilata |
| Inviata | Domanda presentata all'ente |
| Vinta | Contributo ottenuto |
| Persa | Domanda respinta |

### 4.5 Export Click Day

Per i bandi con Click Day, quando tutti i documenti sono approvati, il consulente puo esportare il pacchetto dati in formato JSON per il partner di Click Day (MouseX). L'export contiene:

- Dati della pratica
- Informazioni bando (titolo, ente, data Click Day)
- Dati azienda (ragione sociale, P.IVA, ATECO, regione)
- Lista documenti approvati

---

## 5. Portale Azienda

### 5.1 Dashboard Azienda

Tre metriche:

- **Pratiche attive** — quante pratiche sono aperte
- **Documenti mancanti** (arancione) — documenti da caricare
- **Documenti rifiutati** (rosso) — documenti da ricaricare con correzioni

### 5.2 Bandi Compatibili

Il sistema mostra automaticamente i bandi compatibili con il profilo dell'azienda.

Il **matching automatico** considera:
- **Codice ATECO** — confronto con prefisso (es. se l'azienda ha ATECO 41.20 e il bando ammette 41.*, appare come compatibile)
- **Regione** — bandi regionali filtrati per la regione dell'azienda
- **Dimensione** — micro/piccola/media/grande impresa

> Se non vedi bandi, verifica che il profilo aziendale sia completo (ATECO, regione, dimensione).

### 5.3 Pratiche

L'azienda vede le pratiche aperte dal proprio consulente:

| Colonna | Dettaglio |
|---------|-----------|
| Bando | Titolo del bando |
| Ente | Ente emittente |
| Stato | Badge colorato con stato attuale |
| Documenti | Barra progresso approvati/totale |
| Consulente | Nome del consulente assegnato |

#### Dettaglio pratica (lato azienda)

Mostra:
- Informazioni sul bando (con link alla scheda ufficiale)
- Dati del consulente assegnato (nome e email per contatto)
- Checklist documenti con stato
- **Alert azione richiesta**: se ci sono documenti mancanti o rifiutati, un avviso evidenzia quali documenti servono e i motivi del rifiuto

---

## 6. Flusso Completo: dalla registrazione al Click Day

Ecco il percorso tipico, passo per passo:

### Fase 1: Setup iniziale

```
ADMIN                          CONSULENTE                    AZIENDA
  |                                |                            |
  |-- Pubblica bando ------------> |                            |
  |                                |-- Invita azienda --------> |
  |                                |                            |-- Si registra
  |                                |                            |-- Completa onboarding
  |                                |                            |   (P.IVA, ATECO, regione)
  |                                |<-- Relazione attiva -------|
```

### Fase 2: Matching e apertura pratica

```
SISTEMA                        CONSULENTE                    AZIENDA
  |                                |                            |
  |-- Matching bando/azienda ----> |                            |
  |   (ATECO, regione, dim.)       |                            |-- Vede bandi compatibili
  |                                |-- Crea pratica ----------> |
  |                                |   (seleziona bando+cliente)|
  |-- Genera checklist ----------> |                            |
  |   (documenti dal bando)        |                            |
```

### Fase 3: Raccolta e revisione documenti

```
CONSULENTE                                                    AZIENDA
  |                                                              |
  |                                                              |-- Vede checklist
  |                                                              |-- Carica documenti
  |<-- Notifica: documento caricato -----------------------------|
  |-- Revisiona documento                                        |
  |   - Approva ------------------------------------------------>|-- Vede "Approvato"
  |   - Rifiuta (con motivo) ----------------------------------->|-- Vede motivo rifiuto
  |                                                              |-- Ricarica documento
  |<-- Notifica: documento ricaricato ----------------------------|
  |-- Ri-revisiona                                               |
```

### Fase 4: Invio e Click Day

```
CONSULENTE                     SISTEMA                       PARTNER
  |                                |                            |
  |-- Tutti documenti OK          |                            |
  |-- Aggiorna stato: "Pronta"    |                            |
  |-- Export Click Day ---------->|-- Genera JSON ------------->|
  |                                |   (dati azienda+documenti) |
  |-- Aggiorna stato: "Inviata"   |                            |-- Invio Click Day
  |                                |                            |
  |-- Aggiorna stato: "Vinta"     |                            |
  |   oppure "Persa"              |                            |
```

---

## Appendice: Account Demo

| Ruolo | Email | Password |
|-------|-------|----------|
| Admin | admin@finagevolata.it | admin123456 |

Per creare account consulente e azienda, usa la pagina di registrazione (`/register`).

### Sequenza consigliata per la demo

1. Accedi come **Admin** → pubblica 2-3 bandi con codici ATECO diversi
2. Esci e **registra un Consulente** → accedi al portale consulente
3. Dal consulente, **invita un'azienda** (usa un'altra email)
4. Esci e **registra l'Azienda** invitata → completa l'onboarding con ATECO compatibile
5. Accedi come azienda → mostra i **bandi compatibili** (matching automatico)
6. Rientra come consulente → **crea una pratica** (seleziona bando e cliente)
7. Mostra la **checklist documenti** generata automaticamente
8. Mostra il flusso di revisione documenti e aggiornamento stato

### Punti chiave da evidenziare in demo

- **Checklist automatica**: la piattaforma sa quali documenti servono per ogni bando
- **Matching intelligente**: l'azienda vede solo i bandi per cui e eleggibile
- **Visibilita condivisa**: consulente e azienda vedono lo stesso stato in tempo reale
- **Niente piu Excel e email**: tutto centralizzato in un unico sistema
- **Click Day integrato**: export dati pronto per il partner di invio rapido
