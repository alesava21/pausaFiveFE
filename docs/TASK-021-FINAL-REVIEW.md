# TASK-021 — Revisione finale completa della PR1

## Perimetro ed evidenze

PR: https://github.com/alesava21/pausaFiveFE/pull/1.
Base main verificata nel repository e nella cache AO:
`585c5e1fd0d377dd57c132af12e12bcddf1ccb50`.
HEAD richiesto: `c5535dc24026b6c9467654083eeb445eba5a3784`.
Esaminato il diff completo main→HEAD, tutti i file applicativi/test/config
introdotti dalla PR, non soltanto il commit di copertura. Le correzioni qui
elencate sono contenute nel commit che aggiunge questo report.

Lavoro nel worktree isolato `task021-completion/PausaFiveFE`, branch locale
`fix/task-021-ui-coverage`. Checkout FE originale e modifiche BE/AO preservati.
Nessun merge, force push, commento GitHub, risoluzione thread o richiesta AO.

La rete del sandbox non raggiunge api.github.com. Storico letto integralmente
dalla cache SQLite AO, aperta **solo in lettura**:16 review_run e27 thread,
con `review_partial=0`. La cache della PR è osservata il23 ottobre2026,
23:27:41 UTC, con HEAD c5535dc. Non è una nuova interrogazione live GitHub.
Stato amministrativo storico: tutti27 ancora aperti; la classificazione sotto
riguarda il contenuto tecnico, non modifica lo stato GitHub dei thread.

## Deduplicazione delle osservazioni precedenti

### Indici undo0..80 — 2 thread

Superato; round-trip DOM su celle10/11 e suite state.

- [PRRT_kwDOVSbeTc6vyFVc](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364479340)
- [PRRT_kwDOVSbeTc6vyN1o](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364536009)

### Focus seguito da click — 3 thread

Superato; DOM focus→click/blur→click ed E2E Chromium/WebKit conservati.

- [PRRT_kwDOVSbeTc6vyFVg](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364479346)
- [PRRT_kwDOVSbeTc6vyFVq](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364479361)
- [PRRT_kwDOVSbeTc6vyN1t](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364536018)

### Lock/recovery dopo errore finish — 1 thread

Superato nel codice; aggiunte regressioni rete→503,409→GET fallita, doppio retry e cancellazione su destroy.

- [PRRT_kwDOVSbeTc6vyFVi](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364479350)

### Errore GET iniziale — 1 thread

Superato nel codice; aggiunta prova503 con retry e avvio successivo.

- [PRRT_kwDOVSbeTc6vyFVo](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364479357)

### Keypad cella zero — 0 thread

Superato nel codice; aggiunta fixture con cella0 editabile e interazione keypad/clear.


### CTA dopo refresh/undo — 1 thread

Superato nel codice; aggiunte prove DOM e browser su griglia completa recuperata e ricompletata da undo.

- [PRRT_kwDOVSbeTc6vyFVw](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364479371)

### Getter localStorage negato — 1 thread

Superato; helper con getter protetto e test state e DOM con getter e metodi negati. Avviso persistenza ora effettivo.

- [PRRT_kwDOVSbeTc6vyFV2](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364479378)

### Confini3×3 — 1 thread

Superato nel CSS; misure browser estese a tutti i lati e confronto con bordo ordinario.

- [PRRT_kwDOVSbeTc6vyFV6](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364479385)

### pendingFinish nel template — 1 thread

Superato; signal pubblico e build production con strictTemplates.

- [PRRT_kwDOVSbeTc6vyp9_](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364724489)

### Payload/pending dopo retry422 — 1 thread

Parzialmente risolto a c5535dc: payload corrente sì, clearing422 no. Corretto qui usando lo stesso percorso errori per invio e retry; regressione rete→422→correzione→200.

- [PRRT_kwDOVSbeTc6vyp-G](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364724498)

### Copertura componente e solving — 15 thread

Richiesta storica superata da c5535dc (27 component test,14 E2E). Rafforzata qui:45 component test e18 casi browser definiti; esito browser finale da verificare separatamente.

- [PRRT_kwDOVSbeTc6vyN1z](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364536026)
- [PRRT_kwDOVSbeTc6vyQk3](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364554439)
- [PRRT_kwDOVSbeTc6vyXr8](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364602715)
- [PRRT_kwDOVSbeTc6vyb8z](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364631332)
- [PRRT_kwDOVSbeTc6vyhBt](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364665183)
- [PRRT_kwDOVSbeTc6vykk5](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364688590)
- [PRRT_kwDOVSbeTc6vyp-I](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364724502)
- [PRRT_kwDOVSbeTc6vytxE](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364750801)
- [PRRT_kwDOVSbeTc6vyxHi](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364773456)
- [PRRT_kwDOVSbeTc6vyz4q](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364792173)
- [PRRT_kwDOVSbeTc6vy2oj](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364811084)
- [PRRT_kwDOVSbeTc6vy52C](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364832966)
- [PRRT_kwDOVSbeTc6vy8kp](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364851730)
- [PRRT_kwDOVSbeTc6vzA6w](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364880607)
- [PRRT_kwDOVSbeTc6vzFH0](https://github.com/alesava21/pausaFiveFE/pull/1#discussion_r4364909805)

## Difetti aggiuntivi trovati e corretti

1. **Indizi alterabili tramite undo salvato.** Una cronologia formalmente valida
   poteva puntare a un given e sostituirlo con qualsiasi cifra. Riprodotto con
   test DOM fallito (indizio5→9), poi corretto: validazione dello stato rispetto
   ai givens autorevoli anche nei flag delle celle e nei target undo; guardia
   aggiuntiva in undo. I dati incoerenti vengono scartati.
2. **Retry non protetto durante GET.** Prima il lock iniziava soltanto dopo la
   riconciliazione e la sottoscrizione esterna sopravviveva al componente.
   Ora tutta GET→eventuale POST è un'unica pipeline cancellabile su destroy,
   con lock immediato, finalize comune e protezione da doppio click. Enter
   riconcilia anch'esso una richiesta incerta prima di un nuovo invio.
3. **Corsa tra daily e start.** open() tentava di richiamarsi mentre busy era
   ancora true, lasciando la pagina senza sessione utilizzabile. Ora ritenta
   una sola volta dopo finalize; un secondo mismatch espone Riprova senza loop.
   La sessione precedente è azzerata prima dell'apertura del nuovo puzzle.
4. **Risultato WON recuperato e durata fittizia.** Eliminata la seconda GET:
   lo stato WON già ricevuto è autorevole. Il contratto backend non include la
   durata nella sessione: la UI la indica come non disponibile dopo recupero.
   Il valore0 della risposta finish rimane invece una durata server valida.
5. **Timer locale e avviso Storage inattivi.** Ora appare un tempo di gioco
   chiaramente indicativo, calcolato da startedAt, distinto dal reset e dal
   risultato server. Gli errori di scrittura attivano l'avviso di mancato
   salvataggio; la partita continua in memoria. Il finish aggiorna l'orologio
   anche prima del prossimo tick, evitando invii locali dopo il reset.
6. **Tipo sessione non conforme.** Rimosso extends DailyTimingDto: TASK-020
   restituisce sessionId,puzzleId,mode,status,startedAt, senza serverDate o
   nextResetAt. Le fixture ora hanno esattamente questa forma; il timing daily
   rimane nel DTO daily. Nessuna API backend aggiunta o modificata.

## Qualità dei test e compatibilità backend

Le prove del componente usano eventi DOM e HTTP testing al confine del client
reale con interceptor CSRF. Non forzano board/result o lifecycle per ottenere
una vittoria. Il solving riempie tutte le celle mancanti attraverso tastiera;
si verifica la board inviata, nessuna vittoria prima di200,422 senza premio,
409 EXPIRED/WON, retry0 e controlli abilitati/disabilitati. Le nuove regressioni
su undo dei givens, GET aggiuntiva e lock sono state viste fallire prima del fix.
Nessuna suite cancellata, nessun timeout aumentato o expectation rimossa per
nascondere difetti. Le due vecchie aspettative di GET duplicate sono state
sostituite da expectNone, coerentemente col fix funzionale.

Gli E2E usano build production, click e keypress Playwright, API controllate
con verifica CSRF e confronto completo con la soluzione fixture test-only.
Nessun solver o soluzione importato dalla app, né token guest persistiti nello
Storage. Controlli320px usano geometria e computed styles del browser reale,
non jsdom. Tutti i casi sono eseguiti su Chromium e WebKit, retries0, forbidOnly
in CI. I test UI con API simulate **non** certificano PostgreSQL: le garanzie
owner/CSRF/soluzione/scadenza restano server-side in TASK-020; qui è stato letto
il relativo servizio/DTO e non modificato o dichiarato rieseguito il backend.

L'interceptor comune preserva credenziali same-origin/CSRF, nessun invio POST
automaticamente ritentato dal client. Le note/mosse locali non fanno richieste.
Gli input backend rimangono esattamente81 cifre e i givens non sono sostituibili
con dati di Storage. Nessuna soluzione è richiesta, ricevuta o visualizzata.
Le modifiche catalogo/route rendono disponibile solo Sudoku DAILY, lasciando
illimitato fuori scope. Word mantiene le proprie rotte, client e DTO.

## CI dello SHA originale richiesto

Fonte: cache AO read-only, ogni check legato esattamente a
`c5535dc24026b6c9467654083eeb445eba5a3784`, run push40039542160.

| Job | Esito | Evidenza |
| --- | --- | --- |
| CI frontend completata | passed/success | [Job](https://github.com/alesava21/pausaFiveFE/actions/runs/40039542160/job/120707799098) |
| Formattazione e lint | passed/success | [Job](https://github.com/alesava21/pausaFiveFE/actions/runs/40039542160/job/120707102734) |
| Sudoku UI Chromium e WebKit | passed/success | [Job](https://github.com/alesava21/pausaFiveFE/actions/runs/40039542160/job/120707102917) |
| Test e build statica | passed/success | [Job](https://github.com/alesava21/pausaFiveFE/actions/runs/40039542160/job/120707102598) |
| Vulnerabilità dipendenze | passed/success | [Job](https://github.com/alesava21/pausaFiveFE/actions/runs/40039542160/job/120707102898) |

Questi cinque successi **non** approvano le correzioni successive. Dopo il push
va controllato il nuovo SHA. Il workflow è stato letto integralmente: quality
include formato,lint,typecheck E2E; verify include tutte le suite Angular e Node
più build; e2e include build,installazione Chromium/WebKit ed entrambe le suite;
security fa npm audit anche sul tooling; gate dipende da tutti e quattro e non
ammette E2E falliti. Nessun continue-on-error o filtro esclude le nuove prove.

## Verifiche di questa revisione

Toolchain Node24.16.0/npm11.13.0:

- `npm run test:ci`: **197 Angular**, inclusi45 del componente, più2 Node;
  passati, nessuno skipped. Anche le suite Word/catalogo/rotte sono eseguite.
- `npm run lint`: exit0.
- `npm run test:e2e:types`: exit0.
- `npm run build`: exit0,19 route prerenderizzate. Rimane il warning SCSS
  preesistente5,26kB sopra warning4kB/sotto errore8kB; budget non alterati.
- `npm run format:check` e `git diff --check`: exit0.
- `npm run test:e2e`: tentato qui, si arresta prima dei casi con
  listen EPERM127.0.0.1:4307. Non dichiarato passato nel sandbox.
- 18 E2E (9 scenari per due browser) richiesti al terminale del proprietario;
  esito da aggiornare dopo esecuzione.
- Pubblicazione in avanzamento e CI del nuovo SHA: ancora da verificare.

## Verdetto al momento della preparazione

**NOT READY** finché E2E e cinque job della CI del commit correttivo non sono
verificati. Nessun problema noto resta senza correzione nel codice analizzato;
questa affermazione non sostituisce la verifica delle modifiche pubblicate.
Nessuna approvazione Codex storica si applica automaticamente a un nuovo SHA.
