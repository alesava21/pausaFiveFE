import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  it('rende navigazione, contenuto e collegamento per saltare al contenuto', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('a[href="#contenuto"]')?.textContent).toContain(
      'Vai al contenuto',
    );
    expect(element.querySelector('main#contenuto')).not.toBeNull();
    expect(element.querySelectorAll('nav[aria-label]').length).toBe(2);
  });
});
