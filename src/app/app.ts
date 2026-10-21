import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './core/layout/header';
import { Footer } from './core/layout/footer';
import { ApiErrorNotice } from './core/layout/api-error-notice';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, ApiErrorNotice],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
