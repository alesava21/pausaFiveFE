import { Component, computed, input } from '@angular/core';

type Tone = 'info' | 'success' | 'warning' | 'error';

@Component({
  selector: 'app-status-message',
  template: `
    <div
      class="message"
      [class.error]="tone() === 'error'"
      [class.warning]="tone() === 'warning'"
      [attr.role]="tone() === 'error' ? 'alert' : 'status'"
    >
      <span aria-hidden="true">{{ icon() }}</span>
      <p>
        <strong>{{ label() }}:</strong> {{ message() }}
      </p>
    </div>
  `,
  styles: `
    .message {
      display: flex;
      gap: var(--space-3);
      padding: var(--space-4);
      border: 1px solid currentColor;
      border-radius: var(--radius-sm);
      color: var(--color-primary);
      background: var(--color-surface);
      overflow-wrap: anywhere;
    }
    p {
      margin: 0;
      min-width: 0;
    }
    .error {
      color: var(--color-error);
    }
    .warning {
      color: var(--color-warning);
    }
  `,
})
export class StatusMessage {
  readonly tone = input<Tone>('info');
  readonly message = input.required<string>();
  readonly label = computed(
    () =>
      ({
        info: 'Informazione',
        success: 'Operazione riuscita',
        warning: 'Attenzione',
        error: 'Errore',
      })[this.tone()],
  );
  readonly icon = computed(
    () => ({ info: 'i', success: '✓', warning: '!', error: '!' })[this.tone()],
  );
}
