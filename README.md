# Pausa5 — frontend

Frontend Angular 22 standalone, TypeScript e template strict, in italiano.
Backend e kit condiviso sono nella cartella sorella `../PausaFiveBE/`.
Leggere AGENTS.md, architettura e decisioni del kit prima di lavorare.

## Ambiente e comandi

Node esatto 24.16.0 e npm 11.13.0 (ADR-016), indicati in `.nvmrc`,
`engines` e `packageManager`; le versioni delle dipendenze sono nel lockfile.

```sh
nvm use
npm ci
npm run lint
npm run format:check
npm test -- --watch=false
npm run build
npm start
```

La build di produzione prerenderizza le 12 rotte M1, genera HTML completo e
asset in `dist/PausaFiveFE/browser` e non richiede un server Node in produzione.
Le feature sono caricate lazy. Title e meta description cambiano per pagina;
la pagina 404 ha noindex e le rotte sconosciute vi sono indirizzate nel router.
Non si accede direttamente a window/document o al backend durante il prerender.

`deploy/nginx.static.conf` è un esempio di server statico per servire questa
cartella: accesso diretto ai percorsi generati, error_page dedicata con status
404 per URL sconosciuti. Il proxy API e il deploy completo sono in TASK-009.
Non sostituire la gestione 404 con un fallback generalizzato a index.html.
La configurazione Nginx è predisposta; il collaudo del server è nel task ambiente.

## Stato del prodotto

Sono predisposte homepage, catalogo, pagine dei giochi e informazioni con
contenuto minimo. Le partite e il catalogo da API saranno implementati nei
rispettivi task. Privacy, cookie e contatti sono esplicitamente in preparazione,
non costituiscono informative definitive e devono essere completati prima
che il sito venga pubblicato. Il design system completo è in TASK-006;
canonical, sitemap e SEO completo in TASK-027.

ESLint include controlli Angular/template/accessibilità e vincoli sugli import:
core/shared non importano feature e ogni feature resta indipendente dalle altre.
Prettier gestisce i file applicativi e di configurazione, senza riscrivere il kit.

## Cache e configurazione locale

Gli script Angular passano da `tools/ng.mjs`: su macOS ARM64 usa la cache SQLite
integrata nel builder per evitare il SIGABRT/134 del modulo nativo LMDB.
La cache resta attiva e gli argomenti CLI vengono inoltrati normalmente.
Un valore esplicito di `NG_BUILD_CACHE_STORE` prevale sulla scelta automatica.

`.env.example` contiene soltanto valori pubblici di sviluppo; lo scaffold non
legge automaticamente `.env`. Non inserire segreti nella configurazione Angular.
Il frontend ha il proprio repository Git; board e report sono nel backend.
La licenza del progetto è da scegliere in `../PausaFiveBE/LICENSE-TODO.md`.

## Componenti condivisi (TASK-006)

Widget standalone in `src/app/shared/ui`, Header/Navigation/Footer in core/layout.
Token in styles.scss, focus nativo, feedback testuali e reduced-motion.
21 test, lint e build passati; il proprietario ha confermato il collaudo visivo.
Dettagli nel kit: `docs/16-DESIGN-SYSTEM.md` e report TASK-006.
Dopo il cambio dell'entry globale CSS in SCSS riavviare il server di sviluppo.


## Restyle con Angular Material

Angular Material e CDK **22.2.4** (MIT), pin esatto nel lockfile. Tema light
personalizzato tramite le API Sass pubbliche in `styles.scss`; font di sistema,
nessun font o asset da CDN. Card e pulsanti condivisi usano Material; le anteprime
originali di parole, Sudoku e 2048 sono HTML/CSS decorative, non partite attive.
Homepage e catalogo mantengono l’indicazione Prossimamente. Ripple disabilitato
sui pulsanti; focus visibile, touch target e reduced-motion preservati.
Nessun nuovo server necessario: riavviare il proprio `npm start` dopo l’installazione.
Report del restyle nel kit condiviso: `docs/reports/TASK-006A.md`.


## Client HTTP (TASK-007)

`provideApi()` configura HttpClient e l’interceptor in `core/api`. I DTO pubblici
seguono `docs/03-API-CONTRACTS.md` nel kit backend; nessuna chiamata parte
all’avvio o durante il prerender delle pagine attuali.

Per le mutazioni `/api/v1` same-origin, `CsrfService` carica pigramente
`GET /api/v1/csrf` e conserva il token soltanto in memoria. Le richieste concorrenti
condividono il caricamento; header `X-CSRF-TOKEN` gestito centralmente, cookie
lasciati al browser e nessuna lettura JS. Transfer cache HTTP disabilitata sulle
API; timeout predefinito 10 secondi per richiesta.

Retry massimo due volte, con attese 250/500 ms, solo per status 0/502/503/504:
GET oppure POST `/sessions/{id}/word/guesses` con `Idempotency-Key` non vuota.
La chiave deve essere fornita dal consumer per la singola mossa; non viene
inventata dall’interceptor e resta identica nei retry. Nessun retry su 4xx,
429 o altre scritture, anche se hanno una chiave non supportata dal contratto.
Dopo 401/403 il token rifiutato viene scartato, senza ripetere la mossa.

Gli errori Problem Details sono riconosciuti dal Content-Type e dalla forma;
`ApiError` conserva soltanto status/kind e messaggio italiano locale. Body,
URL, detail/title/code/traceId remoti non sono mostrati o conservati nell’errore.
Un avviso accessibile nella shell può essere chiuso senza reinviare la richiesta.

L’endpoint CSRF e le sessioni guest reali saranno implementati nel TASK-015:
questo task verifica il client con HttpTestingController, non dichiara
un’integrazione con endpoint ancora assenti. Proxy locale previsto nel TASK-009;
nessuna chiamata cross-origin con credenziali abilitata.

## CI GitHub Actions (TASK-008, in revisione)

Il workflow `.github/workflows/ci.yml` è predisposto per push, PR e avvio manuale.
Usa Node da `.nvmrc` (24.16.0), npm 11.13.0, cache npm e token `contents: read`;
nessun secret di produzione o deploy. Le action sono fissate a SHA ufficiali.
Job separati: formatter/lint, unit test + build statica, `npm audit --audit-level=high`
(incluso tooling dev). Il gate finale fallisce se un job fallisce o viene saltato.
Se npm audit non raggiunge il registry, il job fallisce: non è una scansione pulita.

Comandi locali equivalenti, dopo `nvm use` e `npm ci`:

```sh
npm run format:check
npm run lint
npm run test:ci
npm run build
npm audit --audit-level=high
```

`test:ci` salva JUnit in `test-results/unit.xml` (ignorato da Git); il workflow
carica solo quel report, anche se un test fallisce, con retention di 7 giorni.
Non pubblica build o release. Richiedere il check `CI frontend completata` nelle
regole del ramo GitHub prima di usarlo come gate di merge/release.

Restano da verificare un run GitHub positivo, un run su ramo con test fallito e
l’esito dell’audit online: nessun remote è ancora configurato e il registry non
è raggiungibile dalla sessione dell’agente. La prova negativa locale ha restituito
exit 1; dopo rimozione del test temporaneo la suite è tornata a 70 test passati.

## Proxy locale (TASK-009)

`npm start` usa `proxy.conf.json`: `/api/**` inoltrato a
`http://127.0.0.1:8080`, path e Origin preservati. API/cookie/CSRF restano
same-origin dal browser; nessun CORS wildcard. Dopo modifiche al proxy/config
riavviare il proprio server Angular. Non aggiungere `/actuator/**` al proxy.

Il backend può usare il PostgreSQL Homebrew esistente oppure il DB Compose
isolato su 55432. Onboarding in sei passaggi, comandi di stop e collaudo in
`../PausaFiveBE/docs/18-LOCAL-DEVELOPMENT.md`. In questo punto della roadmap
GET `/api/v1/games` risponde 403 Problem Details dal backend; il catalogo 200
sarà disponibile da TASK-011. Questa risposta verifica il proxy senza anticipare
endpoint di gioco. Nessuna chiamata API automatica durante il prerender.

Anteprima statica Nginx sull’host opzionale dopo build, tramite
`../PausaFiveBE/tools/serve-static-dev.sh`: porta 8081 e 404 reale; dettagli nel
runbook locale. Non è un deploy o un nuovo requisito per `npm start`.
