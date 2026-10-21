import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <h1>Pagina non trovata</h1>
    <p>La pagina che cerchi non è disponibile.</p>
    <a routerLink="/">Torna alla pagina iniziale</a>
  `,
})
export class NotFoundPage {}
