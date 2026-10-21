import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WordPreview } from './word-preview';

describe('Anteprime grafiche Word', () => {
  it('fa provare scrittura, cancellazione, invio e ripristino con dati locali', () => {
    TestBed.configureTestingModule({ imports: [WordPreview], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(WordPreview);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    for (const key of 'LIBRA') component.write(key);
    component.write('⌫');
    component.write('O');
    expect(component.draft).toBe('LIBRO');
    component.submit();
    fixture.detectChanges();
    expect(component.attempts()).toHaveLength(3);
    expect(component.draft).toBe('');
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('input'));
    expect(component.message()).toContain('simulati');
    component.reset();
    expect(component.attempts()).toHaveLength(2);
  });

  it('rifiuta input malformati e termina dopo sei righe', () => {
    TestBed.configureTestingModule({ imports: [WordPreview], providers: [provideRouter([])] });
    const component = TestBed.createComponent(WordPreview).componentInstance;
    component.draft = 'CITTÀ';
    component.submit();
    expect(component.attempts()).toHaveLength(2);
    for (let index = 0; index < 5; index++) {
      component.draft = 'LIBRO';
      component.submit();
    }
    expect(component.attempts()).toHaveLength(6);
  });
});
