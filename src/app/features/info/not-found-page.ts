import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, MatButtonModule],
  template: `
    <p class="eyebrow">Errore 404</p>
    <h1>Pagina non trovata</h1>
    <p>La pagina che cerchi non è disponibile.</p>
    <a matButton="filled" [disableRipple]="true" routerLink="/">Torna alla pagina iniziale</a>
  `,
})
export class NotFoundPage {}
