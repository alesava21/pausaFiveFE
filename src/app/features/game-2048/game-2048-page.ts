import { Component, input } from '@angular/core';
import { EmptyState } from '../../shared/ui/empty-state';

@Component({
  selector: 'app-game-2048-page',
  imports: [EmptyState],
  template: `
    <div class="page-intro">
      <p class="eyebrow">La tua pausa di logica</p>
      <h1>{{ heading() }}</h1>
      <p>{{ description() }}</p>
    </div>
    <app-empty-state
      heading="Prossimamente"
      message="La partita sarà disponibile a breve. Intanto puoi scoprirne le regole."
    />
  `,
})
export class Game2048Page {
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
}
