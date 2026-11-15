import { Component, inject, signal } from '@angular/core';
import { Portal, type FileKind } from '../portal.service';

@Component({
  selector: 'app-papers',
  templateUrl: './papers.html',
})
export class Papers {
  readonly portal = inject(Portal);
  readonly initialName = this.portal.profile()?.name ?? '';
  readonly initialVehicle = this.portal.vehicle() || this.portal.profile()?.vehicle_number || '';
  readonly aadhaarName = signal(this.hint('aadhaar', 'Aadhaar'));
  readonly licenceName = signal(this.hint('licence', 'Driving licence'));
  readonly rcName = signal(this.hint('rc', 'Vehicle RC'));

  submit(event: Event, name: string, vehicle: string): void {
    event.preventDefault();
    void this.portal.submitPapers(name, vehicle);
  }

  async onFile(kind: Extract<FileKind, 'aadhaar' | 'licence' | 'rc'>, event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    const file = input.files?.[0] ?? null;
    const ok = await this.portal.stageFile(kind, file);
    if (!ok || !file) {
      return;
    }
    if (kind === 'aadhaar') {
      this.aadhaarName.set(file.name);
    } else if (kind === 'licence') {
      this.licenceName.set(file.name);
    } else {
      this.rcName.set(file.name);
    }
  }

  private hint(kind: 'aadhaar' | 'licence' | 'rc', label: string): string {
    const paper = this.portal.profile()?.documents[kind];
    return paper?.on_file ? `${label} is on file` : '';
  }
}
