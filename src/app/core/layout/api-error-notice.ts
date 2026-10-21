import { Component, inject } from '@angular/core';
import { Button } from '../../shared/ui/button';
import { StatusMessage } from '../../shared/ui/status-message';
import { ApiErrorStore } from '../api/api-error-store';

@Component({
  selector: 'app-api-error-notice',
  imports: [Button, StatusMessage],
  template: `
    @if (errors.error(); as error) {
      <section aria-label="Problema di connessione al servizio">
        <app-status-message tone="error" [message]="error.message" />
        <app-button variant="secondary" (activated)="errors.dismiss()"
          >Chiudi il messaggio</app-button
        >
      </section>
    }
  `,
  styles: `
    section {
      display: grid;
      gap: 1rem;
      margin-bottom: 2rem;
    }
  `,
})
export class ApiErrorNotice {
  protected readonly errors = inject(ApiErrorStore);
}
