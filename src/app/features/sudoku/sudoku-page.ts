import { Component, input } from '@angular/core';

@Component({
  selector: 'app-sudoku-page',
  template: `
    <h1>{{ heading() }}</h1>
    <p>{{ description() }}</p>
    <p>La partita sarà disponibile prossimamente.</p>
  `,
})
export class SudokuPage {
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
}
