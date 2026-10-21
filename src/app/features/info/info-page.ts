import { Component, input } from '@angular/core';

@Component({
  selector: 'app-info-page',
  template: `<h1>{{ heading() }}</h1>
    <p>{{ description() }}</p>`,
})
export class InfoPage {
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
}
