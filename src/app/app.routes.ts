import { Route, Routes } from '@angular/router';

const catalog = () => import('./features/catalog/catalog-page').then((page) => page.CatalogPage);
const word = () => import('./features/word/word-page').then((page) => page.WordPage);
const sudoku = () => import('./features/sudoku/sudoku-page').then((page) => page.SudokuPage);
const info = () => import('./features/info/info-page').then((page) => page.InfoPage);

function page(
  path: string,
  heading: string,
  description: string,
  loadComponent: NonNullable<Route['loadComponent']>,
  noindex = false,
): Route {
  return { path, title: heading, data: { heading, description, noindex }, loadComponent };
}

export const routes: Routes = [
  page(
    '',
    'Giochi gratis, ogni giorno',
    'Una pausa di parole, numeri e logica: scopri i giochi di Pausa5.',
    () => import('./features/catalog/home-page').then((page) => page.HomePage),
  ),
  page(
    'giochi',
    'Tutti i giochi',
    'Scopri Parola segreta, Sudoku e 2048, tra sfide quotidiane e modalità illimitate.',
    catalog,
  ),
  page(
    'parola-del-giorno',
    'Parola del giorno',
    'Indovina una parola italiana di cinque lettere in sei tentativi. Una sfida quotidiana uguale per tutti.',
    word,
  ),
  page(
    'parole-illimitate',
    'Parole illimitate',
    'Allenati con parole italiane di cinque lettere: sei tentativi per ogni nuova parola.',
    word,
  ),
  page(
    'sudoku-online',
    'Sudoku online gratis',
    'Completa la griglia 9 × 9: ogni riga, colonna e riquadro deve contenere i numeri da 1 a 9 senza ripetizioni.',
    sudoku,
  ),
  page(
    'sudoku-del-giorno',
    'Sudoku del giorno',
    'Una nuova griglia Sudoku ogni giorno, con gli stessi indizi per tutti i giocatori.',
    sudoku,
  ),
  page(
    '2048',
    'Gioca a 2048',
    'Unisci le tessere dello stesso valore in una griglia 4 × 4 e prova a raggiungere 2048.',
    () => import('./features/game-2048/game-2048-page').then((page) => page.Game2048Page),
  ),
  page(
    'come-si-gioca',
    'Come si gioca',
    'Parola segreta richiede una parola di cinque lettere in sei tentativi. Nel Sudoku ogni cifra compare una sola volta per riga, colonna e riquadro. In 2048 unisci tessere uguali per raddoppiarne il valore.',
    info,
  ),
  page(
    'privacy',
    'Privacy',
    'Informativa in preparazione: prima dell’apertura pubblica saranno disponibili titolare, finalità e tempi di conservazione dei dati.',
    info,
  ),
  page(
    'cookie-policy',
    'Cookie',
    'Informazioni sui cookie in preparazione. Le informazioni definitive saranno pubblicate prima dell’apertura al pubblico.',
    info,
  ),
  page(
    'contatti',
    'Contatti',
    'I recapiti del progetto saranno disponibili prima dell’apertura pubblica di Pausa5.',
    info,
  ),
  page(
    '404',
    'Pagina non trovata',
    'La pagina che cerchi non è disponibile. Torna alla pagina iniziale di Pausa5.',
    () => import('./features/info/not-found-page').then((page) => page.NotFoundPage),
    true,
  ),
  { path: '**', redirectTo: '404' },
];
