import { Component, input } from '@angular/core';
import { Card } from '../../shared/ui/card';

@Component({
  selector: 'app-info-page',
  imports: [Card],
  template: `<header class="page-intro">
      <p class="eyebrow">Informazioni</p>
      <h1>{{ heading() }}</h1>
    </header>
    <app-card
      ><div class="info-content">
        <p>{{ description() }}</p>
      </div></app-card
    >`,
  styles: `
    .info-content {
      padding: clamp(1.5rem, 4vw, 2.5rem);
    }
    .info-content p {
      margin: 0;
    }
  `,
})
export class InfoPage {
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
}
