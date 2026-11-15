import { Component, inject } from '@angular/core';
import { Papers } from '../papers/papers';
import { Portal, type Screen } from '../portal.service';
import { Raise } from '../raise/raise';
import { Requests } from '../requests/requests';
import { Sheet } from '../sheet/sheet';
import { Themes } from '../theme.service';

@Component({
  selector: 'app-shell',
  imports: [Raise, Requests, Papers, Sheet],
  templateUrl: './shell.html',
})
export class Shell {
  readonly portal = inject(Portal);
  readonly themes = inject(Themes);

  open(screen: Screen): void {
    void this.portal.openScreen(screen);
  }
}
