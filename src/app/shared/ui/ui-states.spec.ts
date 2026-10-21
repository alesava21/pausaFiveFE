import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Button } from './button';
import { ErrorState } from './error-state';
import { Loading } from './loading';
import { StatusMessage } from './status-message';

@Component({
  imports: [Button, ErrorState],
  template: `
    <form (submit)="submitted.set(true); $event.preventDefault()">
      <app-button [busy]="busy()" (activated)="activated.set(activated() + 1)">Conferma</app-button>
    </form>
    <app-error-state [retrying]="busy()" (retry)="retries.set(retries() + 1)" />
  `,
})
class ControlsHost {
  readonly busy = signal(false);
  readonly submitted = signal(false);
  readonly activated = signal(0);
  readonly retries = signal(0);
}

describe('Stati e controlli condivisi', () => {
  it('annuncia caricamento con testo e stato busy', async () => {
    const fixture = TestBed.createComponent(Loading);
    fixture.componentRef.setInput('message', 'Caricamento del gioco…');
    await fixture.whenStable();
    const status = (fixture.nativeElement as HTMLElement).querySelector('[role="status"]');
    expect(status?.getAttribute('aria-busy')).toBe('true');
    expect(status?.textContent).toContain('Caricamento del gioco…');
    expect(status?.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('mantiene il focus nativo e non invia un form senza una scelta esplicita', async () => {
    const fixture = TestBed.createComponent(ControlsHost);
    await fixture.whenStable();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button?.type).toBe('button');
    button?.focus();
    expect(document.activeElement).toBe(button);
    button?.click();
    expect(fixture.componentInstance.activated()).toBe(1);
    expect(fixture.componentInstance.submitted()).toBe(false);
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();
    button?.click();
    expect(button?.disabled).toBe(true);
    expect(fixture.componentInstance.activated()).toBe(1);
  });

  it('espone un errore leggibile e un retry disabilitato durante il caricamento', async () => {
    const fixture = TestBed.createComponent(ControlsHost);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Errore');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Non siamo riusciti');
    const retry = root.querySelector('app-error-state button') as HTMLButtonElement;
    retry.focus();
    expect(document.activeElement).toBe(retry);
    retry.click();
    expect(fixture.componentInstance.retries()).toBe(1);
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();
    retry.click();
    expect(fixture.componentInstance.retries()).toBe(1);
    expect(retry.getAttribute('aria-busy')).toBe('true');
  });

  it.each([
    ['info', 'Informazione', 'status'],
    ['success', 'Operazione riuscita', 'status'],
    ['warning', 'Attenzione', 'status'],
    ['error', 'Errore', 'alert'],
  ])('rende lo stato %s comprensibile senza dipendere dal colore', async (tone, label, role) => {
    const fixture = TestBed.createComponent(StatusMessage);
    fixture.componentRef.setInput('tone', tone);
    fixture.componentRef.setInput('message', 'Messaggio di prova');
    await fixture.whenStable();
    const message = (fixture.nativeElement as HTMLElement).querySelector(`[role="${role}"]`);
    expect(message?.textContent).toContain(label);
    expect(message?.textContent).toContain('Messaggio di prova');
  });
});
