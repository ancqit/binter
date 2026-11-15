import { Component, inject } from '@angular/core';
import { buckets } from '../catalog';
import { statusWord, when } from '../format';
import { Portal, type Span } from '../portal.service';

@Component({
  selector: 'app-sheet',
  templateUrl: './sheet.html',
})
export class Sheet {
  readonly portal = inject(Portal);
  readonly buckets = buckets;
  readonly when = when;
  readonly statusWord = statusWord;

  span(value: Span): void {
    this.portal.setSpan(value);
  }
}
