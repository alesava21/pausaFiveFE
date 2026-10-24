# Report TASK-021 — Copertura UI e correzione focus WebKit

Questo report registra le verifiche del commit `c5535dc`. Per la revisione
completa successiva e le correzioni aggiuntive, vedere
[TASK-021-FINAL-REVIEW.md](TASK-021-FINAL-REVIEW.md).

- **Stato finale:** IN REVIEW; requisiti UI/test verificati, in attesa della
  pubblicazione e della verifica CI remota del nuovo commit.
- **Commit:** commit contenente questo report, basato su `fdee2c3` della PR1.
- **Originale:** `PausaFiveBE/tasks/TASK-021.md` e review Codex della
  [PR frontend1](https://github.com/alesava21/pausaFiveFE/pull/1).
- **Isolamento:** worktree FE
  `/Users/alessandrosava/Pausa5/task021-completion/PausaFiveFE`, branch
  `fix/task-021-ui-coverage`. Checkout principale e worktree AO preservati;
  nessun reset/stash/force push. I documenti TASK021/BOARD/report del checkout
  BE già modificati da Orchestrator non sono stati sovrascritti: questo report
  viaggia con il codice della PR frontend. Nessun task successivo iniziato.

## File creati/modificati

- `src/app/features/sudoku/daily/sudoku-daily-page.spec.ts`:27 component test
  che istanziano il componente reale e agiscono su click, focus e tastiera.
- `src/testing/fixtures/sudoku-daily.ts`: givens/soluzione di test separati
  dagli asset pubblici; nessun import dalla app.
- `src/app/features/sudoku/daily/sudoku-daily-page.ts`: ripristino esplicito
  del focus quando una cella già selezionata riceve click.
- `e2e/sudoku-daily.e2e.spec.ts`, `playwright.config.ts`, `tsconfig.e2e.json`:
  sette scenari eseguiti su Chromium e WebKit,14 casi complessivi.
- `tools/serve-e2e.mjs`: server statico loopback della build solo per test,
  non usato da produzione e senza API fixture nel backend.
- `package.json` e lockfile: script E2E/typecheck e inclusione lint/formato;
  Playwright1.63.0 e tipi Node24.13.3 fissati come dipendenze di sviluppo.
- `.github/workflows/ci.yml`: job E2E obbligatorio e gate finale esteso.
- Piano breve `docs/superpowers/plans/2026-10-24-task021-ui-tests.md` e report.

## Copertura e timing Angular

Le suite state-helper e client già presenti sono conservate. Le nuove prove
esercitano il DOM renderizzato, il SudokuClient reale e l'interceptor API/CSRF
reale, con HttpTestingController che controlla solo il confine HTTP.

L'avvio è in afterNextRender: `createComponent` non significa che la richiesta
sia già partita. Si impostano gli input richiesti e si attende `fixture.whenStable()`
prima di aspettare la GET; poi si rispondono nell'ordine daily → CSRF → sessione.
Dopo risposta o evento si attende il rendering prima dell'assert sul DOM.
La prima prova verifica anche l'assenza di richieste prima del render iniziale.
Non si chiama manualmente open() per aggirare il lifecycle, né si imposta board
via Signal per simulare una partita risolta.

HttpTestingController disattiva il contributo HTTP alla stabilità Angular:
whenStable attende il rendering, non produce una risposta di rete. I test
controllano esplicitamente la richiesta pending e la risposta prima/dopo200.
Timer reali e solo Date.now controllato: nessun sleep arbitrario, fake timer
che blocchi RAF o aumento dei timeout per nascondere fallimenti. I due retry
GET250/500ms sono attraversati con vi.waitFor sulla richiesta reale attesa.
La suite sperimentale eliminata da Nemotron non era disponibile nel tree:
non se ne inventa una diagnosi specifica; il protocollo ripetibile è dimostrato
qui sulla suite nuova mantenuta nel repository.

Casi:81 celle, givens immutabili, keypad/cancella, note e undo, navigazione e
focus→click ripetuto, salvataggio e undo a indice>=10 dopo ricreazione pagina,
Storage negato/corrotto/puzzle diverso/givens alterati, solving di tutte le
celle mancanti attraverso tastiera DOM,200 soltanto dopo risposta server,
422 con correzione,409 EXPIRED/WON, errori400/401/403/429/500/503 senza lock
permanente, errore rete e recupero con board corretta, risposta persa con WON
senza nuovo finish, errore del recupero, scadenza e distruzione timer/listener.

## Difetto reale WebKit, red/green

Il primo E2E eseguito dal proprietario ha prodotto13 passati e1 fallito:
WebKit perdeva il focus dopo focus→click della stessa cella, che rimaneva
aria-selected=true. Nessuna assertion rimossa o timeout aumentato.

Riprodotto nel componente: focus → stabilità → blur → click sulla stessa cella.
Prima del fix il test fallisce: activeElement è body. La selezione non cambia,
quindi afterRenderEffect non è notificato; una futura renderizzazione non può
essere usata per garantire il focus. `selectCell` ora mette esplicitamente il
focus sull'elemento selezionato con preventScroll. La regressione mirata passa.
L'E2E originale rimane invariato, senza refocus forzato dal test dopo click.

## Verifiche eseguite e limiti

Toolchain Node24.16.0/npm11.13.0. Comandi nel worktree isolato:

```sh
npm run test:ci
npm run lint
npm run format:check
npm run build
npm run test:e2e:types
npm run test:e2e -- --list
git diff --check
```

Suite mirata prima del fix:26 test componente passati; regressione focus nuova
fallita prima e passata dopo. Full suite finale dopo il fix:179 Angular (27 del componente) +2 Node,
zero failure/error/skipped, exit0. Lint, formato, typecheck E2E e diff-check
passati dopo le modifiche finali.
Typecheck E2E riuscito. Discovery E2E:14 casi trovati, non equivale a esecuzione.
Build19 route statiche riuscita; warning SCSS preesistente5,26kB sopra warning4kB,
sotto errore8kB, non mascherato alzando budget.

Sandbox dell'agente: browser Chromium termina per MachPort Permission denied;
E2E si ferma prima dei casi per listen EPERM su127.0.0.1:4307. Non dichiarato
E2E passato qui. Primo run browser del proprietario:13/14. Secondo run sul fix:14/14
passati in34,5s, confermato dal proprietario e dal report XML locale aggiornato:
14tests,0failure,0error,0skipped,7Chromium+7WebKit. Screenshot320px WebKit
ispezionato: griglia e controlli nella pagina senza overflow orizzontale.
Nessuna ulteriore review automatica richiesta.

## CI e natura degli E2E

Il job verify esegue `npm run test:ci`: il glob Angular include il nuovo
*.spec.ts e il report JUnit ne dimostra la scoperta/esecuzione. quality esegue
lint, formato e typecheck E2E. Il nuovo job e2e costruisce l'app statica, installa
Chromium/WebKit e avvia `npm run test:e2e`; il gate richiede anche E2E_RESULT=success.
Non ci sono continue-on-error o filtri che escludano la suite. YAML caricato con
Psych e controllati comando test:ci, test:e2e, needs e propagazione del risultato.
Il risultato GitHub CI va verificato sul commit realmente pubblicato, non dedotto
dalla sola definizione del workflow.

Le prove browser usano la route e l'app reali, con API simulate che esigono
CSRF sulle POST. Non costituiscono un nuovo test di PostgreSQL: la verifica
backend della soluzione rimane coperta da TASK020 e non è stata rieseguita qui.
La responsività320px è verificata nel browser con bounding box, scrollWidth,
righe, confini3×3, focus tastiera e screenshot, non tramite una finta larghezza
in jsdom. Chromium/WebKit desktop non sono dichiarati device iOS/Android reali.

## Supply chain

Playwright e playwright-core1.63.0: Microsoft, Apache-2.0,
https://github.com/microsoft/playwright; esportazione ufficiale playwright/test.
@types/node24.13.3 e undici-types transitivo: solo sviluppo, licenze nel lockfile.
Installazione offline da pacchetti cache con URL registry/integrity preservati,
lock normalizzato da npm e installazione verificata. Nessuna dipendenza runtime
aggiunta, nessun solver o soluzione daily esportata negli asset della build.

## Criteri originali

- [x] Interazioni nel browser, HTTP solo caricamento/start/finish/recupero.
- [x] Nessuna soluzione server richiesta/esposta durante la partita.
- [x] Finish passa per API/CSRF;422 non vince e409 rilegge lo stato autorevole.
- [x] Component test givens, note, undo e solving DOM mantenuti ed eseguiti.
- [x] Ripetizione E2E finale con fixture, refresh,320px e focus nei due browser.
- [ ] Push in avanzamento sulla PR1 e CI verde del nuovo commit.

Nessun merge o richiesta automatica di review eseguiti. TASK022 non iniziato.
