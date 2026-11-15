import { Component, inject } from '@angular/core';
import { CollectCard } from '../collect-card/collect-card';
import { Portal } from '../portal.service';

@Component({
  selector: 'app-requests',
  imports: [CollectCard],
  templateUrl: './requests.html',
})
export class Requests {
  readonly portal = inject(Portal);
}
