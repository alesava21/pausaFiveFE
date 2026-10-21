import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-button',
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || busy()"
      [class.secondary]="variant() === 'secondary'"
      [attr.aria-label]="label() || null"
      [attr.aria-busy]="busy() ? 'true' : null"
      (click)="activated.emit()"
    >
      <ng-content />
      @if (busy()) {
        <span class="sr-only">Operazione in corso</span>
      }
    </button>
  `,
  styles: `
    :host {
      display: inline-block;
      max-width: 100%;
    }
    button {
      min-height: var(--touch-target);
      max-width: 100%;
      padding: var(--space-3) var(--space-6);
      border: 1px solid var(--color-primary);
      border-radius: var(--radius-sm);
      font-weight: 650;
      background: var(--color-primary);
      color: var(--color-on-primary);
      overflow-wrap: anywhere;
    }
    button:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }
    button.secondary {
      color: var(--color-primary);
      background: var(--color-surface);
    }
    button.secondary:hover:not(:disabled) {
      background: var(--color-soft);
    }
    button:disabled {
      background: var(--color-soft);
      color: var(--color-muted);
      border-color: var(--color-border);
    }
  `,
})
export class Button {
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly variant = input<'primary' | 'secondary'>('primary');
  readonly disabled = input(false);
  readonly busy = input(false);
  readonly label = input('');
  readonly activated = output<void>();
}
