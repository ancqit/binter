import { Component, inject } from '@angular/core';
import { Themes } from '../theme.service';

@Component({
  selector: 'app-theme-dialog',
  templateUrl: './theme-dialog.html',
})
export class ThemeDialog {
  readonly themes = inject(Themes);
}
