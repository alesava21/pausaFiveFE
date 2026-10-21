import { Component, input, output } from '@angular/core';
import { Button } from './button';
import { StatusMessage } from './status-message';

@Component({
  selector: 'app-error-state',
  imports: [Button, StatusMessage],
  template: `
    <app-status-message tone="error" [message]="message()" />
    @if (retryable()) {
      <app-button [busy]="retrying()" (activated)="retry.emit()">Riprova</app-button>
    }
  `,
  styles: `
    app-button {
      margin-top: var(--space-4);
    }
  `,
})
export class ErrorState {
  readonly message = input('Non siamo riusciti a caricare i contenuti. Riprova tra poco.');
  readonly retryable = input(true);
  readonly retrying = input(false);
  readonly retry = output<void>();
}
