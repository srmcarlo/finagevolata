# Modulo Matching Bandi — Design

**Data:** 2026-04-26
**Stato:** Approvato (in attesa di piano di implementazione)
**Scope:** MVP modulo 6 — Matching bando ↔ profilo azienda

---

## 1. Obiettivo

Suggerire all'azienda i bandi più adatti al suo profilo e al consulente le migliori opportunità tra i suoi clienti. Il matching è il differenziale chiave del prodotto: senza di esso FinAgevolata è un altro gestore documentale.

## 2. Decisioni di scope

| Decisione | Scelta |
|-----------|--------|
| Strategia di filtro | Ibrido: hard filter su criteri obbligatori (ATECO + regione), soft scoring su criteri secondari |
| Surface UI azienda | Dashboard widget + badge match% in lista bandi + pagina dedicata `/azienda/bandi/consigliati` |
| Surface UI consulente | Dashboard widget cross-cliente + tab "Bandi compatibili" su pagina cliente + sezione "Clienti compatibili" su pagina bando |
| Algoritmo ranking | Ibrido pesato: 60% rules score deterministico + 40% semantic score (pgvector) |
| Spiegabilità | Mix: chips (sempre) + paragrafo AI (lazy + cache 30gg) + breakdown numerico opzionale |
| Persistenza | Solo AI explanation cached. Score regole + semantic computati on-demand (nessun cron job per MVP) |

## 3. Architettura

```
CompanyProfile ─┐
                ├──► matchGrantsForCompany() ──► [hard filter SQL] ──► [soft score TS] ──► risultati
Grant ──────────┘                                                                            │
                                                                                             ▼
                                                                                  getMatchExplanation()
                                                                                             │
                                                                          (cache hit) ◄──────┤
                                                                                             ▼
                                                                                          OpenAI
                                                                                             │
                                                                                             ▼
                                                                                  GrantMatchExplanation
                                                                                          (upsert)
```

Pipeline di una richiesta:
1. **Hard filter** in SQL (Postgres): `Grant.eligibleAtecoCodes` overlap con prefisso ATECO azienda + `eligibleRegions` contiene regione + `status = PUBLISHED`
2. **Rules score** in TypeScript per ogni grant superstite (ATECO precision, dimensione, importo, deadline, approvazione admin)
3. **Semantic score** via pgvector cosine similarity tra `Grant.embedding` e `CompanyProfile.embedding` (entrambi già esistenti)
4. **Combine**: `final = 0.6 × rules + 0.4 × semantic`
5. **Chips** derivati dal breakdown
6. **AI paragraph** lazy: chiamato solo quando user apre dettaglio o richiede spiegazione

## 4. Data model

### 4.1 Tabella nuova

```prisma
model GrantMatchExplanation {
  id            String   @id @default(cuid())
  companyId     String   // userId con role=COMPANY
  grantId       String
  matchScore    Int      // 0-100 finale snapshot
  rulesScore    Int
  semanticScore Int
  matchedChips  String[]
  paragraph     String   @db.Text
  computedAt    DateTime @default(now())

  company User  @relation("CompanyMatches", fields: [companyId], references: [id], onDelete: Cascade)
  grant   Grant @relation(fields: [grantId], references: [id], onDelete: Cascade)

  @@unique([companyId, grantId])
  @@index([companyId, computedAt])
  @@map("grant_match_explanations")
}
```

Aggiunge anche relazione opposta:
```prisma
model User {
  // ...
  grantMatches  GrantMatchExplanation[] @relation("CompanyMatches")
}

model Grant {
  // ...
  matchExplanations GrantMatchExplanation[]
}
```

### 4.2 Indici Postgres aggiuntivi

```sql
CREATE INDEX idx_grants_ateco_gin   ON grants USING gin ("eligibleAtecoCodes");
CREATE INDEX idx_grants_region_gin  ON grants USING gin ("eligibleRegions");
```

Necessari per performance hard filter su array (Postgres usa GIN per `&&` e `= ANY`).

### 4.3 Invalidazione cache

Cancellazione record `GrantMatchExplanation` in 3 casi:
- TTL: `computedAt < now() - 30gg` (lazy: scoperto al successivo accesso, ricalcola)
- Profilo azienda modificato: hook in `saveCompanyProfile` chiama `invalidateMatchExplanations({ companyId })` (cancella tutti i record per quella azienda)
- Grant pubblicato/aggiornato: hook in `grants-admin` chiama `invalidateMatchExplanations({ grantId })` (cancella tutti i record per quel bando)

## 5. Algoritmo di scoring

### 5.1 Rules score (60% del peso)

Massimo 100 punti, breakdown:

| Criterio | Punti max | Logica |
|----------|-----------|--------|
| ATECO precisione | 30 | esatto/sottogruppo: 30 · gruppo padre: 20 · solo prefisso: 10 |
| Dimensione | 25 | in `eligibleCompanySizes`: 25 · adiacente (Small↔Micro, Medium↔Small): 15 · no: 0 |
| Importo plausibile | 20 | `maxAmount` ∈ [10%, 100%] di `annualRevenue`: 20 · fuori range: 5 · `annualRevenue == null` o `maxAmount == null`: 10 (neutro) |
| Deadline | 15 | ≥60gg: 15 · ≥30gg: 10 · 15-30gg: 5 · <15gg: 0 |
| Approvato admin | 10 | `approvedByAdmin = true`: 10 · false: 0 |

`atecoMatches` ritorna anche la precisione (`exact | sub | parent | prefix | none`) usata per il punteggio.

### 5.2 Semantic score (40% del peso)

```sql
SELECT 1 - (g.embedding <=> p.embedding) AS similarity
```

Output cosine similarity 0-1, moltiplicato per 100. Embedding vettoriali già generati da `lib/services/rag.ts` (Google `text-embedding-004`, vector(768)).

**Edge case**: se `Grant.embedding` o `CompanyProfile.embedding` è `NULL` (legacy o profilo non ancora indicizzato), semantic score = 50 (neutro) e si segnala via flag interno. La soglia chip "Settore affine" (≥70) non scatterà in quel caso.

**Note sulle soglie**: la scala 0-100 deriva direttamente dal cosine similarity. In pratica gli embedding raramente superano 0.7 (= 70). Se in produzione si osserva clipping verso il basso, la soglia chip e i pesi vanno ricalibrati (rimandato a Fase 2 — vedi section 9).

### 5.3 Score finale

```ts
final = round(0.6 * rulesScore + 0.4 * semanticScore)
```

### 5.4 Chips

Derivati dal breakdown (ordine deterministico):

- `ATECO compatibile` se ateco ≥ 20
- `Dimensione adatta` se dimensione = 25
- `Importo nel range` se importo ≥ 15
- `Tempistica OK` se deadline ≥ 10
- `Settore affine` se semanticScore ≥ 70
- `Approvato` se `approvedByAdmin`

### 5.5 AI paragraph

Modello: `gpt-4o-mini` (riusa stessa chiave OpenAI già configurata per provider ATECO).

Prompt:
```
Sistema:
Sei consulente di finanza agevolata. Spiega in 2-3 frasi italiane perche il bando e adatto all'azienda. Tono diretto, no markdown, no elenchi.

User:
Azienda: <companyName>, settore <atecoDescription> (<atecoCode>), <region>, dim <employeeCount>
Bando: <title>, <issuingBody>, importo <minAmount>-<maxAmount> EUR, deadline <deadline>
Match score: <score>%
Criteri matchati: <chips comma-separated>

Output: paragrafo 2-3 frasi.
```

`temperature: 0.4`, `max_tokens: 200`. Costo stimato ~€0.0001 per paragrafo. Cache 30gg → 1 chiamata per coppia (azienda, bando).

## 6. API — Service + Server Actions

### 6.1 File layout

```
apps/web/lib/
├─ services/
│  ├─ matching.ts       (logica pura, testabile senza Prisma/auth)
│  └─ matching.test.ts
└─ actions/
   ├─ matching.ts       (server actions con auth + Prisma + cache)
   └─ matching.test.ts
```

### 6.2 Service public API

```ts
// lib/services/matching.ts
export interface MatchScoreBreakdown {
  ateco: number;
  size: number;
  amount: number;
  deadline: number;
  approval: number;
}

export interface MatchScore {
  total: number;
  rulesScore: number;
  semanticScore: number;
  breakdown: MatchScoreBreakdown;
  chips: string[];
}

export type AtecoPrecision = "exact" | "sub" | "parent" | "prefix" | "none";

export function atecoMatches(
  profileAteco: string,
  eligibleAtecoCodes: string[]
): { matches: boolean; precision: AtecoPrecision };

export function computeRulesScore(
  profile: { atecoCode: string; employeeCount: CompanySize; annualRevenue: number | null },
  grant: { eligibleAtecoCodes: string[]; eligibleCompanySizes: CompanySize[]; minAmount: number | null; maxAmount: number | null; deadline: Date | null; approvedByAdmin: boolean }
): { score: number; breakdown: MatchScoreBreakdown };

export function combineScores(
  rulesScore: number,
  semanticScore: number,
  weightRules?: number  // default 0.6
): number;

export function deriveChips(
  breakdown: MatchScoreBreakdown,
  semanticScore: number,
  approvedByAdmin: boolean
): string[];
```

### 6.3 Server actions

```ts
// lib/actions/matching.ts
"use server";

matchGrantsForCompany(
  companyId: string,
  opts?: { limit?: number; offset?: number; minScore?: number }
): Promise<Array<{ grant: Grant; score: MatchScore }>>;

getTopMatchesForDashboard(
  companyId: string,
  limit?: number  // default 5
): Promise<Array<{ grant: Grant; score: MatchScore }>>;

getMatchScoreForGrant(
  companyId: string,
  grantId: string
): Promise<MatchScore | null>;

getMatchScoresForGrants(
  companyId: string,
  grantIds: string[]
): Promise<Map<string, MatchScore>>;  // batch helper, evita N+1 nella lista bandi

getMatchExplanation(
  companyId: string,
  grantId: string
): Promise<{
  paragraph: string;
  chips: string[];
  score: MatchScore;
  fromCache: boolean;
}>;

invalidateMatchExplanations(opts: {
  companyId?: string;
  grantId?: string;
}): Promise<void>;

// Consulente
matchGrantsForConsultantClients(
  consultantId: string,
  opts?: { clientId?: string; topNPerClient?: number }
): Promise<Map<string, Array<{ grant: Grant; score: MatchScore }>>>;

matchClientsForGrant(
  consultantId: string,
  grantId: string
): Promise<Array<{ companyId: string; companyName: string; score: MatchScore; hasPractice: boolean }>>;

getTopOpportunitiesForConsultant(
  consultantId: string,
  limit?: number  // default 10
): Promise<Array<{ companyId: string; companyName: string; grant: Grant; score: MatchScore }>>;
```

### 6.4 Hook integrazione esistenti

- `lib/actions/onboarding.ts` `saveCompanyProfile`: dopo update, chiama `invalidateMatchExplanations({ companyId })`
- `lib/actions/grants-admin.ts` su pubblicazione/update: chiama `invalidateMatchExplanations({ grantId })`

### 6.5 Autorizzazione

- COMPANY: vede solo `companyId === session.user.id`. Ogni action verifica.
- CONSULTANT: vede `companyId` solo se in tabella `ConsultantCompany` con quel consulente. Filtro applicato in tutti i query.
- ADMIN: nessun filtro.

Violazione → throw `Error("Non autorizzato")` (pattern esistente nel codebase).

## 7. UI

### 7.1 Componenti riusabili

```
apps/web/components/matching/
├─ match-score-badge.tsx     (badge inline % + colore)
├─ match-card.tsx            (card bando con chips + paragrafo)
├─ match-chips.tsx           (lista pillole)
├─ match-breakdown.tsx       (tabella breakdown numerico opzionale)
└─ match-skeleton.tsx        (loading state)
```

Stack: Tailwind + shadcn/ui (già setup).

Color band del badge:
- `>= 70`: verde (`bg-green-100 text-green-800`)
- `40-69`: arancio (`bg-amber-100 text-amber-800`)
- `< 40`: grigio (`bg-slate-100 text-slate-600`)

### 7.2 Surface azienda

#### Dashboard widget
File: `app/(dashboard)/azienda/page.tsx` (esistente, aggiungo sezione)

Sezione "Bandi consigliati per te" — top 5 cards orizzontali. Server-fetched RSC via `getTopMatchesForDashboard`. Bottone "Vedi tutti" → pagina consigliati.

Loading: 5 skeleton placeholder.

#### Lista bandi con badge
File: `app/(dashboard)/azienda/bandi/page.tsx` (esistente, aggiungo colonna)

Colonna "Match" alla destra di ogni riga. Badge clickable (tooltip chips). Click → dettaglio bando.

Match score caricato in batch via `getMatchScoresForGrants(companyId, grantIds[])` (helper interno) per evitare N+1.

#### Pagina dedicata
File: `app/(dashboard)/azienda/bandi/consigliati/page.tsx` (nuovo)

Lista verticale di card grandi:
- Match% gauge visuale grande
- Titolo + ente + importo + deadline
- Chips matchati (full)
- Paragrafo AI explanation (default visibile, lazy fetch on mount)
- CTA "Inizia pratica" (riusa flusso `Practice` esistente)
- Toggle "Mostra breakdown" → tabella punteggio dettagliato

Filtri: ordinamento default `match desc`. Filtro `min%` (slider 0-100).

### 7.3 Surface consulente

#### Dashboard
File: `app/(dashboard)/consulente/page.tsx` (esistente, aggiungo widget)

Tabella "Top opportunità clienti" — 10 righe `(cliente, bando, match%, deadline)` ordinate per `priority` (vedi formula sotto). Click riga → pagina bando del consulente con cliente preselezionato (`/consulente/bandi/[grantId]?clientId=<id>`, route esistente con query param nuovo).

Formula priority:
```
urgencyBoost = deadline == null ? 0 : clamp(1 - daysUntil(deadline) / 90, 0, 1)
priority     = matchScore + 20 * urgencyBoost
```
Esempio: bando con match 80% e scadenza tra 10gg → priority = 80 + 20×0.89 = 97.8 (sale in cima).

#### Tab cliente
File: `app/(dashboard)/consulente/clienti/[id]/page.tsx` (esistente, aggiungo tab "Bandi compatibili" accanto a tab esistenti)

Tab "Bandi compatibili": stessa UI di pagina consigliati azienda, ma scope = quel cliente. CTA "Avvia pratica per cliente" → crea `Practice` con `consultantId = me, companyId = client` (riusa server action esistente in `lib/actions/practices.ts`).

Nessuna route `/consulente/clienti/[id]/bandi/[grantId]` separata: quando il consulente vuole avviare una pratica, naviga al bando esistente con clientId in query string. Mantengo il numero di nuove rotte minimo.

#### Sezione bando
File: `app/(dashboard)/consulente/bandi/[id]/page.tsx` (esistente, aggiungo sezione)

Sezione "Tuoi clienti compatibili": elenco clienti del consulente con match%. Pulsante "Avvia" se nessuna pratica esistente, badge "in corso" se già attiva.

## 8. Testing

Vitest già setup. Riuso pattern di `lib/actions/*.test.ts` esistenti.

### 8.1 Unit test logica pura

`lib/services/matching.test.ts`:
- `atecoMatches`: tutti i casi precision (exact, sub, parent, prefix, none) + edge case (vuoto, case insensitive, spazi)
- `computeRulesScore`: ogni criterio singolo + combinazioni + bordi (deadline negativa, revenue null, eligibleSizes vuoto)
- `combineScores`: aritmetica corretta, peso default, peso custom
- `deriveChips`: presenza + ordine deterministico + soglie

### 8.2 Integration test server actions

`lib/actions/matching.test.ts`:
- Mock prisma + auth
- Auth boundary: COMPANY non vede match di altre aziende
- Auth boundary: CONSULTANT vede solo clienti propri
- Cache hit: secondo `getMatchExplanation` non chiama OpenAI (mock fetch contato)
- Cache miss dopo TTL 30gg: ricomputa
- Invalidation: `saveCompanyProfile` cancella explanations di quella azienda
- Hard filter SQL: bando ATECO incompatibile escluso
- Hard filter SQL: regione non eleggibile esclusa

### 8.3 Mock OpenAI nei test

Stub `globalThis.fetch` per intercettare chiamate a `api.openai.com`. Ritorna paragrafo finto. Nessuna chiamata reale in CI.

### 8.4 Smoke test manuale post-deploy

1. Onboarding azienda con P.IVA reale (Nestlé via VIES) — verifica profilo popolato
2. Dashboard: top 5 bandi consigliati visibili, badge colorati
3. Lista bandi: colonna match presente
4. Pagina consigliati: paragrafo AI generato per primo bando
5. Refresh stessa pagina: paragrafo da cache (verifico log: nessuna chiamata OpenAI)
6. Modifica regione profilo → re-apri pagina → cache invalidata → ricalcolo
7. Login consulente: widget top opportunità clienti popolato
8. Tab "Bandi compatibili" su cliente: lista filtrata
9. CTA "Avvia pratica per cliente": Practice creata correttamente

E2E automation rimandata a Fase 2 (Playwright assente nel progetto).

## 9. Out of scope (Fase 2)

- Cron job ricalcolo notturno (per MVP basta lazy compute)
- Notifiche push/email "nuovo bando matchato per te"
- Match score basato su storico pratiche vinte/perse
- Ranking personalizzato per consulente (es. specializzazioni)
- Export Excel lista match per consulente
- Webhook/API esterne per integrare match in CRM consulente
- A/B test sui pesi 60/40 (potrebbe diventare config admin in futuro)

## 10. Rischi e mitigazioni

| Rischio | Mitigazione |
|---------|-------------|
| Prefix matching ATECO troppo permissivo (es. `01.11` matcha `01`) | Penalizza precision `prefix` con 10/30 punti, riducendo lo score finale |
| Costo OpenAI fuori controllo | Cache 30gg + lazy generation + max_tokens 200. Stima <€10/mese su 1000 utenti |
| Bandi senza embedding (legacy) | Skip semantic per quei grant, score solo regole. Hook ingestion da indicizzare |
| Performance hard filter su 10k+ bandi | Indici GIN su array. Profilare con `EXPLAIN ANALYZE` se >100ms |
| OpenAI down | Fallback: ritorno chips senza paragrafo, UI mostra solo breakdown |
| Profilo azienda incompleto (revenue/foundedAt null) | Punteggi `neutro` (10/20) anziché 0, evita penalizzazioni ingiuste |
