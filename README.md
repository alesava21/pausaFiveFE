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

## Componenti condivisi (TASK-006 in revisione)

Widget standalone in `src/app/shared/ui`, Header/Navigation/Footer in core/layout.
Token in styles.scss, focus nativo, feedback testuali e reduced-motion.
21 test, lint e build passati; il collaudo visivo 320/375/1280 è ancora pendente.
Dettagli nel kit: `docs/16-DESIGN-SYSTEM.md` e report TASK-006.
Dopo il cambio dell'entry globale CSS in SCSS riavviare il server di sviluppo.
