import { Component, inject, signal } from '@angular/core';
import { buckets, locations } from '../catalog';
import { Portal, type FileKind } from '../portal.service';

@Component({
  selector: 'app-raise',
  templateUrl: './raise.html',
})
export class Raise {
  readonly portal = inject(Portal);
  readonly buckets = buckets;
  readonly locations = locations;
  readonly photoName = signal('');
  readonly clipName = signal('Removed after 30 days.');

  submit(event: Event, place: string): void {
    event.preventDefault();
    void this.portal.submitRaise(place);
  }

  pick(group: 'location' | 'bucket', value: string): void {
    if (group === 'location') {
      this.portal.location.set(value);
      return;
    }
    this.portal.bucket.set(value);
  }

  async onFile(kind: Extract<FileKind, 'photo' | 'clip'>, event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    const file = input.files?.[0] ?? null;
    const ok = await this.portal.stageFile(kind, file);
    if (!ok || !file) {
      return;
    }
    if (kind === 'photo') {
      this.photoName.set(file.name);
      return;
    }
    this.clipName.set(file.name);
  }
}
