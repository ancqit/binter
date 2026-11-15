import { Injectable, computed, signal } from '@angular/core';
import {
  ApiError,
  acceptRequest,
  completeRequest,
  createRequest,
  gist,
  login,
  profile,
  putFile,
  requests,
  saveProfile,
  sheet,
  signUpload,
  type CollectRequest,
  type Gist,
  type Profile,
  type Role,
  type Sheet,
  type StoredFile,
} from './api';
import { keepPortal } from './flow';
import { clipDuration, elapsed, ordered } from './format';

const SESSION_KEY = 'binter.session';

export type Screen = 'raise' | 'requests' | 'papers' | 'sheet';
export type Span = 'week' | 'month';
export type FileKind = 'photo' | 'clip' | 'aadhaar' | 'licence' | 'rc';

interface Session {
  token: string;
  role: Role;
  vehicle: string;
}

@Injectable({ providedIn: 'root' })
export class Portal {
  readonly token = signal('');
  readonly role = signal<Role | ''>('');
  readonly vehicle = signal('');
  readonly screen = signal<Screen>('raise');
  readonly error = signal('');
  readonly profile = signal<Profile | null>(null);
  readonly rows = signal<CollectRequest[]>([]);
  readonly gist = signal<Gist | null>(null);
  readonly sheet = signal<Sheet | null>(null);
  readonly span = signal<Span>('week');
  readonly selected = signal<ReadonlySet<string>>(new Set());
  readonly location = signal('yard');
  readonly bucket = signal('');
  readonly busy = signal(false);
  readonly ready = signal(false);
  readonly now = signal(Date.now());

  readonly photo = signal<File | null>(null);
  readonly clip = signal<File | null>(null);
  readonly aadhaar = signal<File | null>(null);
  readonly licence = signal<File | null>(null);
  readonly rc = signal<File | null>(null);

  readonly signedIn = computed(() => this.token().length > 0);
  readonly openCount = computed(() => this.rows().filter((row) => row.status === 'open').length);
  readonly who = computed(() => {
    const role = this.role();
    const current = this.profile();
    if (role === 'receiver' && current?.ready) {
      return `${current.name} · ${current.vehicle_number}`;
    }
    if (role === 'notifier') {
      return 'Notifier';
    }
    if (role === 'admin') {
      return 'Admin';
    }
    return 'Receiver';
  });

  async boot(): Promise<void> {
    const saved = this.readSession();
    if (!saved) {
      this.ready.set(true);
      return;
    }
    this.token.set(saved.token);
    this.role.set(saved.role);
    this.vehicle.set(saved.vehicle);
    const screen = this.homeScreen();
    this.screen.set(screen);
    try {
      if (saved.role === 'receiver' && saved.vehicle) {
        this.profile.set(await profile(saved.token, saved.vehicle));
        this.screen.set(this.homeScreen());
      }
      if (this.screen() === 'requests') {
        await this.loadRows();
      }
      if (this.screen() === 'sheet') {
        await this.loadAdmin();
      }
    } catch (error) {
      this.catchError(error);
    }
    this.ready.set(true);
  }

  async refresh(): Promise<void> {
    if (!this.token() || document.hidden) {
      return;
    }
    if (this.screen() === 'requests') {
      try {
        await this.loadRows();
      } catch (error) {
        this.catchError(error);
      }
    }
    if (this.screen() === 'sheet') {
      try {
        await this.loadAdmin();
      } catch (error) {
        this.catchError(error);
      }
    }
  }

  elapsed(from: string, to: string | null): string {
    return elapsed(from, to, this.now());
  }

  async enter(raw: string): Promise<void> {
    const token = raw.trim();
    if (!token) {
      this.error.set('Enter the number you were given.');
      return;
    }
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      const role = await login(token);
      this.token.set(token);
      this.role.set(role);
      this.vehicle.set('');
      this.profile.set(null);
      this.error.set('');
      this.writeSession();
      this.screen.set(this.homeScreen());
    } catch (error) {
      this.catchError(error);
    } finally {
      this.busy.set(false);
    }
  }

  leave(): void {
    this.token.set('');
    this.role.set('');
    this.vehicle.set('');
    this.profile.set(null);
    this.rows.set([]);
    this.gist.set(null);
    this.sheet.set(null);
    this.selected.set(new Set());
    this.error.set('');
    this.writeSession();
  }

  async openScreen(screen: Screen): Promise<void> {
    if (this.role() === 'receiver' && screen === 'requests' && !this.profile()?.ready) {
      this.screen.set('papers');
      this.error.set('Save the papers first.');
      return;
    }
    this.error.set('');
    try {
      if (screen === 'requests') {
        await this.loadRows();
      }
      if (screen === 'sheet') {
        await this.loadAdmin();
      }
      if (screen === 'papers' && this.vehicle()) {
        this.profile.set(await profile(this.token(), this.vehicle()));
      }
      this.screen.set(screen);
    } catch (error) {
      this.catchError(error);
      if (!keepPortal(this.token())) {
        return;
      }
      this.screen.set(screen);
    }
  }

  async stageFile(kind: FileKind, file: File | null): Promise<boolean> {
    this.file(kind).set(null);
    if (file && kind === 'clip') {
      try {
        const duration = await clipDuration(file);
        if (!Number.isFinite(duration) || duration <= 0 || duration > 10.05) {
          this.error.set('The clip must be ten seconds or less.');
          return false;
        }
      } catch (error) {
        this.error.set(error instanceof Error ? error.message : 'Use a clip of ten seconds or less.');
        return false;
      }
    }
    this.file(kind).set(file);
    this.error.set('');
    return true;
  }

  async submitRaise(placeRaw: string): Promise<void> {
    const place = placeRaw.trim();
    if (!this.bucket()) {
      this.error.set('Choose a bucket.');
      return;
    }
    if (place.length < 2) {
      this.error.set('Name the place.');
      return;
    }
    const photo = this.photo();
    if (!photo) {
      this.error.set('Add a photograph.');
      return;
    }
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      const storedPhoto = await this.uploadKind('photo', photo);
      const clip = this.clip();
      const storedClip = clip ? await this.uploadKind('clip', clip) : null;
      await createRequest(this.token(), {
        bucket: this.bucket(),
        location_type: this.location(),
        location_label: place,
        photo: storedPhoto,
        clip: storedClip,
      });
      this.photo.set(null);
      this.clip.set(null);
      this.bucket.set('');
      this.error.set('');
      await this.openScreen('requests');
    } catch (error) {
      this.catchError(error);
    } finally {
      this.busy.set(false);
    }
  }

  async submitPapers(nameRaw: string, vehicleRaw: string): Promise<void> {
    const name = nameRaw.trim();
    const vehicle = vehicleRaw.trim();
    if (name.length < 2) {
      this.error.set('Enter the name.');
      return;
    }
    if (!vehicle) {
      this.error.set('Enter the vehicle number from the RC.');
      return;
    }
    const kinds = ['aadhaar', 'licence', 'rc'] as const;
    for (const kind of kinds) {
      const onFile =
        this.profile()?.vehicle_number === vehicle.replace(/[^A-Za-z0-9]/g, '').toUpperCase() &&
        this.profile()?.documents[kind].on_file;
      if (!this.file(kind)() && !onFile) {
        this.error.set('Add the Aadhaar, driving licence, and vehicle RC.');
        return;
      }
    }
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      this.vehicle.set(vehicle);
      const documents: Record<string, StoredFile | undefined> = {};
      for (const kind of kinds) {
        const file = this.file(kind)();
        if (file) {
          documents[kind] = await this.uploadKind(kind, file);
        }
      }
      const saved = await saveProfile(this.token(), vehicle, {
        name,
        vehicle_number: vehicle,
        documents,
      });
      this.profile.set(saved);
      this.vehicle.set(saved.vehicle_number);
      this.writeSession();
      for (const kind of kinds) {
        this.file(kind).set(null);
      }
      this.error.set('');
      await this.openScreen('requests');
    } catch (error) {
      this.catchError(error);
    } finally {
      this.busy.set(false);
    }
  }

  async accept(ids: string[]): Promise<void> {
    if (!this.profile()?.ready) {
      this.error.set('Save the papers first.');
      return;
    }
    try {
      for (const id of ids) {
        await acceptRequest(this.token(), this.vehicle(), id);
        const next = new Set(this.selected());
        next.delete(id);
        this.selected.set(next);
      }
      this.error.set('');
      await this.loadRows();
    } catch (error) {
      this.catchError(error);
      if (!keepPortal(this.token())) {
        return;
      }
      try {
        await this.loadRows();
      } catch (refreshError) {
        this.catchError(refreshError);
      }
    }
  }

  acceptSelected(): void {
    void this.accept([...this.selected()]);
  }

  async complete(id: string): Promise<void> {
    try {
      await completeRequest(this.token(), this.vehicle(), id);
      this.error.set('');
      await this.loadRows();
    } catch (error) {
      this.catchError(error);
    }
  }

  toggle(id: string, on: boolean): void {
    const next = new Set(this.selected());
    if (on) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.selected.set(next);
  }

  setSpan(span: Span): void {
    this.span.set(span);
    void this.openScreen('sheet');
  }

  bucketCount(id: string): number {
    return this.gist()?.by_bucket[id] ?? 0;
  }

  private file(kind: FileKind) {
    if (kind === 'photo') return this.photo;
    if (kind === 'clip') return this.clip;
    if (kind === 'aadhaar') return this.aadhaar;
    if (kind === 'licence') return this.licence;
    return this.rc;
  }

  private homeScreen(): Screen {
    if (this.role() === 'admin') {
      return 'sheet';
    }
    if (this.role() === 'receiver') {
      return this.profile()?.ready ? 'requests' : 'papers';
    }
    return 'raise';
  }

  private async loadRows(): Promise<void> {
    const rows = ordered(
      await requests(this.token(), this.role() === 'receiver' ? this.vehicle() : ''),
    );
    const live = new Set(rows.filter((row) => row.status === 'open').map((row) => row.id));
    const selected = new Set(this.selected());
    for (const id of selected) {
      if (!live.has(id)) {
        selected.delete(id);
      }
    }
    this.selected.set(selected);
    this.rows.set(rows);
  }

  private async loadAdmin(): Promise<void> {
    this.gist.set(await gist(this.token()));
    this.sheet.set(await sheet(this.token(), this.span()));
  }

  private async uploadKind(kind: string, file: File): Promise<StoredFile> {
    const ticket = await signUpload(this.token(), '', kind, file);
    if (kind === 'clip' && ticket.max_seconds) {
      const duration = await clipDuration(file);
      if (duration > ticket.max_seconds + 0.05) {
        throw new ApiError('The clip must be ten seconds or less.', 400);
      }
    }
    return putFile(ticket, file);
  }

  private catchError(error: unknown): void {
    if (error instanceof ApiError && error.status === 401) {
      this.leave();
      this.error.set(error.message);
      return;
    }
    this.error.set(error instanceof Error ? error.message : 'The portal could not do that.');
  }

  private readSession(): Session | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Session;
      if (
        !parsed.token ||
        (parsed.role !== 'notifier' && parsed.role !== 'receiver' && parsed.role !== 'admin')
      ) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private writeSession(): void {
    try {
      const token = this.token();
      const role = this.role();
      if (!token || !role) {
        sessionStorage.removeItem(SESSION_KEY);
        return;
      }
      const session: Session = { token, role, vehicle: this.vehicle() };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // The visit still holds the number in memory.
    }
  }
}
