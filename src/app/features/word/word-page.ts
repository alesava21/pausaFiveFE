import { Component, input } from '@angular/core';

@Component({
  selector: 'app-word-page',
  template: `
    <h1>{{ heading() }}</h1>
    <p>{{ description() }}</p>
    <p>La partita sarà disponibile prossimamente.</p>
  `,
})
export class WordPage {
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
}
