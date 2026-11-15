import { Component, inject } from '@angular/core';
import { Gate } from './gate/gate';
import { Portal } from './portal.service';
import { Shell } from './shell/shell';
import { ThemeDialog } from './theme-dialog/theme-dialog';
import { Themes } from './theme.service';

@Component({
  selector: 'app-root',
  imports: [Gate, Shell, ThemeDialog],
  templateUrl: './app.html',
})
export class App {
  readonly themes = inject(Themes);
  readonly portal = inject(Portal);

  constructor() {
    void this.portal.boot();
    window.setInterval(() => this.portal.now.set(Date.now()), 1000);
    window.setInterval(() => void this.portal.refresh(), 4000);
  }
}
