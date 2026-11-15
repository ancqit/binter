import { Injectable, signal } from '@angular/core';
import { applyTheme, chooseTheme, currentTheme, themes, type Theme } from './themes';

@Injectable({ providedIn: 'root' })
export class Themes {
  readonly list = themes;
  readonly current = signal<Theme>(currentTheme());
  readonly opened = signal(false);

  constructor() {
    this.apply(this.current());
  }

  show(): void {
    this.opened.set(true);
  }

  close(): void {
    this.opened.set(false);
  }

  choose(id: string): void {
    chooseTheme(id);
    this.current.set(currentTheme());
  }

  private apply(theme: Theme): void {
    applyTheme(theme);
  }
}
