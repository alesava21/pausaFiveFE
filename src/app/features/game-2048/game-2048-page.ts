import { Component, input } from '@angular/core';

@Component({
  selector: 'app-game-2048-page',
  template: `
    <h1>{{ heading() }}</h1>
    <p>{{ description() }}</p>
    <p>La partita sarà disponibile prossimamente.</p>
  `,
})
export class Game2048Page {
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
}
