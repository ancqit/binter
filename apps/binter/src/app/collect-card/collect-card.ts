import { Component, computed, inject, input } from '@angular/core';
import type { CollectRequest } from '../api';
import { safeUrl } from '../format';
import { Portal } from '../portal.service';

@Component({
  selector: 'app-collect-card',
  templateUrl: './collect-card.html',
})
export class CollectCard {
  readonly row = input.required<CollectRequest>();
  readonly portal = inject(Portal);
  readonly photo = computed(() => {
    const file = this.row().photo;
    return file ? safeUrl(file.url) : '';
  });
  readonly clip = computed(() => {
    const file = this.row().clip;
    return file ? safeUrl(file.url) : '';
  });

  taken(): boolean {
    return this.portal.selected().has(this.row().id);
  }

  toggle(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    this.portal.toggle(this.row().id, input.checked);
  }

  accept(): void {
    void this.portal.accept([this.row().id]);
  }

  complete(): void {
    void this.portal.complete(this.row().id);
  }
}
