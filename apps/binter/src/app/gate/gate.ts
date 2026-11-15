import { Component, inject } from '@angular/core';
import { Portal } from '../portal.service';
import { Themes } from '../theme.service';

@Component({
  selector: 'app-gate',
  templateUrl: './gate.html',
})
export class Gate {
  readonly portal = inject(Portal);
  readonly themes = inject(Themes);

  enter(event: Event, raw: string): void {
    event.preventDefault();
    void this.portal.enter(raw);
  }
}
