# Pausa5 — frontend

Questa cartella `PausaFiveFE/` contiene il frontend Angular di Pausa5.
Il backend e il kit operativo condiviso sono in `../PausaFiveBE/`.

## Stato attuale

Sono presenti lo scaffold Angular 22.2.x, `package.json`, lockfile, sorgenti
iniziali e un repository Git separato (commit iniziale `72ffad1`).
TASK-001 completa le convenzioni senza modificare lo scaffold o le dipendenze.
Il bootstrap conforme al prodotto resta in TASK-005: mancano prerender statico,
strict TypeScript completo, UI italiana e struttura applicativa prevista.
La baseline richiesta dal proprietario è Node esatto 24.16.0 (ADR-016).

## Comandi dello scaffold esistente

Dalla cartella frontend, selezionare Node 24.16.0 tramite `nvm use`
(`.nvmrc`); npm richiesto 11.13.0. Le versioni sono dichiarate anche in `engines`
e controllate da `.npmrc` (`engine-strict=true`).

```sh
# Installazione da lockfile: comando disponibile, non rieseguito in TASK-001.
npm ci

# Server di sviluppo: script presente, avvio non collaudato in TASK-001.
npm start

# Due test dello scaffold; non testano ancora funzionalità del prodotto.
npm test -- --watch=false

# Build di produzione dello scaffold, verificata con Node 24.16.0.
npm run build
```

La shell di questa macchina seleziona normalmente Node 22.16.0, rifiutato dal
CLI installato: selezionare Node 24.16.0 prima di eseguire i comandi.
Non è presente uno script lint.

Gli script npm passano da `tools/ng.mjs`: su macOS ARM64 seleziona la cache
SQLite già integrata in Angular al posto di LMDB, che in questo ambiente
termina con SIGABRT (134) durante la chiusura della cache nativa. La cache
rimane attiva e non servono flag CI o modifiche alla telemetria. Gli argomenti
del CLI vengono inoltrati normalmente. Un valore esplicito di
`NG_BUILD_CACHE_STORE` prevale sulla selezione automatica.
Prerender statico e proxy API sono **NON ANCORA CONFIGURATI** (TASK-005/009).

## Convenzioni e documentazione

Leggere `../PausaFiveBE/AGENTS.md`, `docs/02-ARCHITECTURE.md`,
`docs/12-DECISIONS.md` (ADR-015) e il task assegnato in `tasks/` nel backend.
Stato operativo in `../PausaFiveBE/tasks/BOARD.md`.

Da PausaFiveBE, `sh tools/check-repository.sh` verifica anche questa cartella.
`.editorconfig` prescrive UTF-8, LF e 2 spazi; `.gitignore` esclude build,
IDE, segreti e dati locali. `.env.example` contiene soltanto valori pubblici
di sviluppo: lo scaffold non legge ancora questo file. Non inserire segreti
nella configurazione pubblica Angular.

La licenza del progetto è ancora da scegliere dal proprietario:
`../PausaFiveBE/LICENSE-TODO.md`.
