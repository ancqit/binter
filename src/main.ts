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
import { applyTheme, chooseTheme, currentTheme, themes } from './themes';

const SESSION_KEY = 'binter.session';

const buckets = [
  { id: 'ferrous', name: 'Ferrous metal', note: 'Steel, iron, and other magnetic scrap.' },
  { id: 'nonferrous', name: 'Non-ferrous metal', note: 'Aluminium, copper, brass, and other metal that is not magnetic.' },
  { id: 'glass', name: 'Glass', note: 'Bottles, jars, and broken glass.' },
];

const locations = [
  { id: 'indoor', name: 'Indoor' },
  { id: 'yard', name: 'Yard' },
  { id: 'gate', name: 'Gate' },
];

type Screen = 'raise' | 'requests' | 'papers' | 'sheet';
type Span = 'week' | 'month';

interface Session {
  token: string;
  role: Role;
  vehicle: string;
}

const state: {
  token: string;
  role: Role | '';
  vehicle: string;
  screen: Screen;
  error: string;
  profile: Profile | null;
  rows: CollectRequest[];
  gist: Gist | null;
  sheet: Sheet | null;
  span: Span;
  selected: Set<string>;
  location: string;
  bucket: string;
  busy: boolean;
  themeOpen: boolean;
} = {
  token: '',
  role: '',
  vehicle: '',
  screen: 'raise',
  error: '',
  profile: null,
  rows: [],
  gist: null,
  sheet: null,
  span: 'week',
  selected: new Set(),
  location: 'yard',
  bucket: '',
  busy: false,
  themeOpen: false,
};

const files: Record<string, File | null> = {
  photo: null,
  clip: null,
  aadhaar: null,
  licence: null,
  rc: null,
};

let lastStack = '';

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[char] ?? char;
  });
}

function safeUrl(url: string): string {
  if (url.startsWith('/')) {
    return url;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch {
    return '';
  }
  return '';
}

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Session;
    if (!parsed.token || (parsed.role !== 'notifier' && parsed.role !== 'receiver' && parsed.role !== 'admin')) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(): void {
  try {
    if (!state.token || !state.role) {
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    const session: Session = { token: state.token, role: state.role, vehicle: state.vehicle };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // The visit still holds the number in memory.
  }
}

function elapsed(from: string, to: string | null): string {
  const start = Date.parse(from);
  const end = to ? Date.parse(to) : Date.now();
  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  const pad = (value: number) => String(value).padStart(2, '0');
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`;
}

function when(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function statusWord(status: CollectRequest['status']): string {
  if (status === 'accepted') {
    return 'On the way';
  }
  if (status === 'done') {
    return 'Collected';
  }
  return 'Waiting';
}

function showError(message: string): void {
  state.error = message;
  const node = document.querySelector('#error');
  if (!(node instanceof HTMLElement)) {
    return;
  }
  node.hidden = !message;
  node.textContent = message;
}

function catchError(error: unknown): void {
  if (error instanceof ApiError && error.status === 401) {
    leave();
    showError(error.message);
    return;
  }
  showError(error instanceof Error ? error.message : 'The portal could not do that.');
}

function rank(status: CollectRequest['status']): number {
  if (status === 'open') {
    return 0;
  }
  if (status === 'accepted') {
    return 1;
  }
  return 2;
}

function ordered(rows: CollectRequest[]): CollectRequest[] {
  return [...rows].sort((left, right) => {
    const byStatus = rank(left.status) - rank(right.status);
    if (byStatus !== 0) {
      return byStatus;
    }
    return Date.parse(right.created_at) - Date.parse(left.created_at);
  });
}

function lamps(row: CollectRequest): string {
  const collectOn = row.status === 'open';
  const receivedOn = row.status !== 'open';
  const who = row.receiver
    ? `<small>${esc(row.receiver.name)}</small><small class="plate">${esc(row.receiver.vehicle_number)}</small>`
    : '';
  const timer =
    row.accepted_at && receivedOn
      ? `<time class="timer" data-from="${esc(row.accepted_at)}" data-to="${esc(row.completed_at ?? '')}"></time>`
      : '';
  return `<div class="lamps" role="group" aria-label="Collect ${esc(row.collect_number)}">
    <span class="lamp${collectOn ? ' on' : ''}"><i></i><span><b>Collect</b></span></span>
    <span class="lamp received${receivedOn ? ' on' : ''}"><i></i><span><b>Received</b>${who}${timer}</span></span>
  </div>`;
}

function media(row: CollectRequest): string {
  const photo = row.photo ? safeUrl(row.photo.url) : '';
  const clip = row.clip ? safeUrl(row.clip.url) : '';
  return `${photo ? `<img class="shot" alt="" src="${esc(photo)}" />` : ''}
    ${clip ? `<video class="clip" controls playsinline preload="metadata" src="${esc(clip)}"></video>` : ''}`;
}

function card(row: CollectRequest): string {
  const taken = state.selected.has(row.id) ? ' checked' : '';
  const take =
    state.role === 'receiver' && row.status === 'open'
      ? `<label class="take"><input type="checkbox" data-take="${esc(row.id)}"${taken} /><span>Take</span></label>
         <button class="solid" type="button" data-action="accept" data-id="${esc(row.id)}">Accept</button>`
      : '';
  const done =
    state.role === 'receiver' && row.status === 'accepted'
      ? `<button class="quiet" type="button" data-action="complete" data-id="${esc(row.id)}">Collected</button>`
      : '';
  return `<article class="note">
    <div class="note-top">
      <h2 class="collect-no">${esc(row.collect_number)}</h2>
      <span class="pill">${esc(row.bucket_name)}</span>
    </div>
    <p class="place">${esc(row.location_name)} · ${esc(row.location_label)}</p>
    ${lamps(row)}
    ${media(row)}
    ${take}
    ${done}
  </article>`;
}

function acceptBar(): string {
  const count = state.selected.size;
  if (state.role !== 'receiver' || count === 0) {
    return '';
  }
  const label = count === 1 ? '1 selected' : `${count} selected`;
  return `<div class="accept-bar"><span>${label}</span><button class="solid" type="button" data-action="accept-selected">Accept</button></div>`;
}

function stackHtml(): string {
  if (state.rows.length === 0) {
    const line = state.role === 'receiver' ? 'No collect is up.' : 'No collect is waiting.';
    return `<p class="empty">${line}</p>`;
  }
  return `${state.rows.map(card).join('')}${acceptBar()}`;
}

function paintStack(): void {
  const html = stackHtml();
  const node = document.querySelector('#stack');
  if (!(node instanceof HTMLElement)) {
    return;
  }
  if (html === lastStack) {
    tick();
    return;
  }
  lastStack = html;
  node.innerHTML = html;
  tick();
  const open = state.rows.filter((row) => row.status === 'open').length;
  const count = document.querySelector('#open-count');
  if (count) {
    count.textContent = open > 0 ? ` ${open}` : '';
  }
}

function tick(): void {
  document.querySelectorAll('.timer').forEach((node) => {
    if (!(node instanceof HTMLTimeElement)) {
      return;
    }
    const from = node.dataset.from;
    if (!from) {
      return;
    }
    node.textContent = elapsed(from, node.dataset.to || null);
  });
}

function themeDialog(): string {
  if (!state.themeOpen) {
    return '';
  }
  const current = document.documentElement.dataset.theme;
  const choices = themes
    .map((theme) => {
      const on = theme.id === current ? ' on' : '';
      return `<button class="theme-choice${on}" type="button" data-action="theme-choice" data-id="${theme.id}">
        <span class="swatch" style="background-image:url('${theme.preview}')"></span>
        <span class="swatch-name">${esc(theme.name)}</span>
        <span class="swatch-view">${esc(theme.view)}</span>
      </button>`;
    })
    .join('');
  return `<div class="backdrop" data-action="close-theme">
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="theme-title">
      <h2 id="theme-title">Theme</h2>
      <p class="lede">A theme is the view and the wallpaper together.</p>
      <div class="theme-grid">${choices}</div>
    </div>
  </div>`;
}

function paintTheme(): void {
  document.querySelector('#theme-root')?.remove();
  if (!state.themeOpen) {
    return;
  }
  const root = document.createElement('div');
  root.id = 'theme-root';
  root.innerHTML = themeDialog();
  document.body.appendChild(root);
}

function segment(group: string, items: { id: string; name: string }[], current: string): string {
  return `<div class="segment" role="group">${items
    .map((item) => {
      const pressed = item.id === current ? 'true' : 'false';
      return `<button type="button" data-action="pick" data-group="${group}" data-value="${item.id}" aria-pressed="${pressed}">${esc(item.name)}</button>`;
    })
    .join('')}</div>`;
}

function bucketCards(): string {
  return `<div class="buckets">${buckets
    .map((item) => {
      const on = item.id === state.bucket ? ' on' : '';
      const pressed = item.id === state.bucket ? 'true' : 'false';
      return `<button class="bucket${on}" type="button" data-action="pick" data-group="bucket" data-value="${item.id}" aria-pressed="${pressed}">
        <i class="dot"></i>
        <span><strong>${esc(item.name)}</strong><span>${esc(item.note)}</span></span>
      </button>`;
    })
    .join('')}</div>`;
}

function raiseView(): string {
  return `<form class="sheet" id="raise">
    <h1>Raise a collect</h1>
    <p class="lede">Choose the place and the bucket. Collect sends it to the vehicles.</p>
    <span class="field-label">Location</span>
    ${segment('location', locations, state.location)}
    <label class="field-label" for="place">Place</label>
    <input id="place" name="place" type="text" maxlength="60" autocomplete="off" />
    <span class="field-label">Bucket</span>
    ${bucketCards()}
    <label class="field-label" for="photo">Photograph</label>
    <input id="photo" data-file="photo" type="file" accept="image/jpeg,image/png,image/webp" />
    <p class="file-name" id="photo-name"></p>
    <label class="field-label" for="clip">Ten-second clip</label>
    <input id="clip" data-file="clip" type="file" accept="video/mp4,video/webm,video/quicktime" />
    <p class="file-name" id="clip-name">Removed after 30 days.</p>
    <p class="error" id="error" hidden></p>
    <button class="solid wide" type="submit">Collect</button>
  </form>`;
}

function requestsView(): string {
  const title = state.role === 'receiver' ? 'Collects' : 'Raised';
  const lede =
    state.role === 'receiver'
      ? 'Take one or several. Accept starts the timer and lights Received for the person who asked.'
      : 'Collect stays lit until a vehicle takes it. Received lights with their name and number.';
  return `<section class="sheet">
    <h1>${title}</h1>
    <p class="lede">${lede}</p>
    <p class="error" id="error" hidden></p>
    <div id="stack"></div>
  </section>`;
}

function papersView(): string {
  const name = state.profile?.name ?? '';
  const vehicle = state.vehicle || state.profile?.vehicle_number || '';
  const hint = (kind: 'aadhaar' | 'licence' | 'rc', label: string) => {
    const paper = state.profile?.documents[kind];
    return paper?.on_file ? `${label} is on file` : '';
  };
  return `<form class="sheet" id="papers">
    <h1>Papers</h1>
    <p class="lede">Name, vehicle number, Aadhaar, driving licence, and the vehicle RC. Then the collects arrive.</p>
    <label class="field-label" for="name">Name</label>
    <input id="name" name="name" type="text" maxlength="80" autocomplete="name" value="${esc(name)}" />
    <label class="field-label" for="vehicle">Vehicle number</label>
    <input id="vehicle" name="vehicle" type="text" maxlength="16" autocapitalize="characters" autocomplete="off" value="${esc(vehicle)}" />
    <label class="field-label" for="aadhaar">Aadhaar</label>
    <input id="aadhaar" data-file="aadhaar" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
    <p class="file-name">${esc(hint('aadhaar', 'Aadhaar'))}</p>
    <label class="field-label" for="licence">Driving licence</label>
    <input id="licence" data-file="licence" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
    <p class="file-name">${esc(hint('licence', 'Driving licence'))}</p>
    <label class="field-label" for="rc">Vehicle RC</label>
    <input id="rc" data-file="rc" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
    <p class="file-name">${esc(hint('rc', 'Vehicle RC'))}</p>
    <p class="error" id="error" hidden></p>
    <button class="solid wide" type="submit">Save papers</button>
  </form>`;
}

function sheetView(): string {
  const gistBlock = state.gist
    ? `<div class="gist">
        <div><span>Waiting</span><strong>${state.gist.open}</strong></div>
        <div><span>On the way</span><strong>${state.gist.accepted}</strong></div>
        <div><span>Collected</span><strong>${state.gist.done}</strong></div>
      </div>
      <p class="counts">${buckets.map((item) => `${esc(item.name)} ${state.gist?.by_bucket[item.id] ?? 0}`).join(' · ')}</p>
      <p class="counts">${state.gist.week} this week · ${state.gist.month} this month · ${state.gist.receivers} vehicle${state.gist.receivers === 1 ? '' : 's'} on file</p>`
    : '';
  const rows = state.sheet?.rows ?? [];
  const body =
    rows.length === 0
      ? `<p class="empty">Nothing in this span.</p>`
      : `<div class="table-wrap"><table>
          <thead><tr><th>Collect</th><th>When (IST)</th><th>Bucket</th><th>Place</th><th>Status</th><th>Vehicle</th><th>Time</th></tr></thead>
          <tbody>${rows
            .map((row) => {
              const vehicle = row.receiver ? `${esc(row.receiver.name)} ${esc(row.receiver.vehicle_number)}` : '';
              const time = row.accepted_at
                ? `<time class="timer" data-from="${esc(row.accepted_at)}" data-to="${esc(row.completed_at ?? '')}"></time>`
                : '';
              return `<tr>
                <td>${esc(row.collect_number)}</td>
                <td>${esc(when(row.created_at))}</td>
                <td>${esc(row.bucket_name)}</td>
                <td>${esc(row.location_name)} · ${esc(row.location_label)}</td>
                <td>${statusWord(row.status)}</td>
                <td>${vehicle}</td>
                <td>${time}</td>
              </tr>`;
            })
            .join('')}</tbody>
        </table></div>`;
  const weekOn = state.span === 'week' ? 'true' : 'false';
  const monthOn = state.span === 'month' ? 'true' : 'false';
  return `<section class="sheet">
    <h1>Sheet</h1>
    <p class="lede">Raised collects. The bucket clears after 30 days.</p>
    ${gistBlock}
    <span class="field-label">Span</span>
    <div class="segment" role="group">
      <button type="button" data-action="span" data-value="week" aria-pressed="${weekOn}">This week</button>
      <button type="button" data-action="span" data-value="month" aria-pressed="${monthOn}">This month</button>
    </div>
    <p class="error" id="error" hidden></p>
    ${body}
  </section>`;
}

function whoLine(): string {
  if (state.role === 'receiver' && state.profile?.ready) {
    return `${state.profile.name} · ${state.profile.vehicle_number}`;
  }
  if (state.role === 'notifier') {
    return 'Notifier';
  }
  if (state.role === 'admin') {
    return 'Admin';
  }
  return 'Receiver';
}

function dock(): string {
  const open = state.rows.filter((row) => row.status === 'open').length;
  const mark = `<em id="open-count">${open > 0 ? ` ${open}` : ''}</em>`;
  if (state.role === 'notifier') {
    return `<button type="button" data-action="go" data-screen="raise" class="${state.screen === 'raise' ? 'on' : ''}">Raise</button>
      <button type="button" data-action="go" data-screen="requests" class="${state.screen === 'requests' ? 'on' : ''}">Requests${mark}</button>`;
  }
  if (state.role === 'receiver') {
    return `<button type="button" data-action="go" data-screen="papers" class="${state.screen === 'papers' ? 'on' : ''}">Papers</button>
      <button type="button" data-action="go" data-screen="requests" class="${state.screen === 'requests' ? 'on' : ''}">Collects${mark}</button>`;
  }
  return `<button type="button" data-action="go" data-screen="sheet" class="on">Sheet</button>`;
}

function renderShell(): void {
  const app = document.querySelector('#app');
  if (!(app instanceof HTMLElement)) {
    return;
  }
  lastStack = '';
  const outlet =
    state.screen === 'raise'
      ? raiseView()
      : state.screen === 'papers'
        ? papersView()
        : state.screen === 'sheet'
          ? sheetView()
          : requestsView();
  app.innerHTML = `<div class="frame">
    <header class="top">
      <div>
        <p class="brand">Sunskriti</p>
        <p class="who">${esc(whoLine())}</p>
      </div>
      <div class="actions">
        <button class="leave" type="button" data-action="theme">Theme</button>
        <button class="leave" type="button" data-action="leave">Leave</button>
      </div>
    </header>
    <div id="outlet">${outlet}</div>
    <nav class="dock">${dock()}</nav>
  </div>`;
  if (state.screen === 'requests') {
    paintStack();
  }
  tick();
  if (state.error) {
    showError(state.error);
  }
}

function renderGate(): void {
  const app = document.querySelector('#app');
  if (!(app instanceof HTMLElement)) {
    return;
  }
  app.innerHTML = `<section class="gate">
    <div class="theme-float"><button class="leave" type="button" data-action="theme">Theme</button></div>
    <form class="card" id="gate">
      <p class="brand">Sunskriti</p>
      <h1>Enter the portal</h1>
      <p class="lede">The authority gives the number. Metals and glass.</p>
      <label class="field-label" for="portal-number">Number</label>
      <input id="portal-number" name="token" type="text" autocomplete="off" maxlength="80" />
      <button class="solid wide" type="submit">Enter</button>
      <p class="error" id="error" hidden></p>
    </form>
  </section>`;
  if (state.error) {
    showError(state.error);
  }
}

function homeScreen(): Screen {
  if (state.role === 'admin') {
    return 'sheet';
  }
  if (state.role === 'receiver') {
    return state.profile?.ready ? 'requests' : 'papers';
  }
  return 'raise';
}

async function loadRows(): Promise<void> {
  state.rows = ordered(await requests(state.token, state.role === 'receiver' ? state.vehicle : ''));
  const live = new Set(state.rows.filter((row) => row.status === 'open').map((row) => row.id));
  state.selected.forEach((id) => {
    if (!live.has(id)) {
      state.selected.delete(id);
    }
  });
}

async function loadAdmin(): Promise<void> {
  state.gist = await gist(state.token);
  state.sheet = await sheet(state.token, state.span);
}

async function openScreen(screen: Screen): Promise<void> {
  if (state.role === 'receiver' && screen === 'requests' && !state.profile?.ready) {
    state.screen = 'papers';
    state.error = 'Save the papers first.';
    renderShell();
    return;
  }
  state.screen = screen;
  state.error = '';
  try {
    if (screen === 'requests') {
      await loadRows();
    }
    if (screen === 'sheet') {
      await loadAdmin();
    }
    if (screen === 'papers' && state.vehicle) {
      state.profile = await profile(state.token, state.vehicle);
    }
  } catch (error) {
    catchError(error);
    if (!keepPortal(state.token)) {
      return;
    }
  }
  renderShell();
}

function leave(): void {
  state.token = '';
  state.role = '';
  state.vehicle = '';
  state.profile = null;
  state.rows = [];
  state.gist = null;
  state.sheet = null;
  state.selected.clear();
  state.error = '';
  writeSession();
  renderGate();
}

async function stageFile(kind: string, file: File | null): Promise<void> {
  files[kind] = null;
  const name = document.querySelector(`#${kind}-name`);
  if (file && kind === 'clip') {
    try {
      const duration = await clipDuration(file);
      if (!Number.isFinite(duration) || duration <= 0 || duration > 10.05) {
        showError('The clip must be ten seconds or less.');
        return;
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Use a clip of ten seconds or less.');
      return;
    }
  }
  files[kind] = file;
  showError('');
  if (name && file) {
    name.textContent = file.name;
  }
}

function clipDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Use a clip of ten seconds or less.'));
    };
    video.src = url;
  });
}

async function uploadKind(kind: string, file: File): Promise<StoredFile> {
  const ticket = await signUpload(state.token, '', kind, file);
  if (kind === 'clip' && ticket.max_seconds && file) {
    const duration = await clipDuration(file);
    if (duration > ticket.max_seconds + 0.05) {
      throw new ApiError('The clip must be ten seconds or less.', 400);
    }
  }
  return putFile(ticket, file);
}

async function submitGate(form: HTMLFormElement): Promise<void> {
  const input = form.elements.namedItem('token');
  const token = input instanceof HTMLInputElement ? input.value.trim() : '';
  if (!token) {
    showError('Enter the number you were given.');
    return;
  }
  const button = form.querySelector('button[type="submit"]');
  if (button instanceof HTMLButtonElement) {
    button.disabled = true;
  }
  try {
    const role = await login(token);
    state.token = token;
    state.role = role;
    state.vehicle = '';
    state.profile = null;
    state.error = '';
    writeSession();
    state.screen = homeScreen();
    renderShell();
  } catch (error) {
    if (button instanceof HTMLButtonElement) {
      button.disabled = false;
    }
    catchError(error);
  }
}

async function submitRaise(form: HTMLFormElement): Promise<void> {
  const placeInput = form.elements.namedItem('place');
  const place = placeInput instanceof HTMLInputElement ? placeInput.value.trim() : '';
  if (!state.bucket) {
    showError('Choose a bucket.');
    return;
  }
  if (place.length < 2) {
    showError('Name the place.');
    return;
  }
  if (!files.photo) {
    showError('Add a photograph.');
    return;
  }
  const button = form.querySelector('button[type="submit"]');
  if (button instanceof HTMLButtonElement) {
    button.disabled = true;
  }
  state.busy = true;
  try {
    const photo = await uploadKind('photo', files.photo);
    const clip = files.clip ? await uploadKind('clip', files.clip) : null;
    await createRequest(state.token, {
      bucket: state.bucket,
      location_type: state.location,
      location_label: place,
      photo,
      clip,
    });
    files.photo = null;
    files.clip = null;
    state.bucket = '';
    state.error = '';
    await openScreen('requests');
  } catch (error) {
    if (button instanceof HTMLButtonElement) {
      button.disabled = false;
    }
    catchError(error);
  } finally {
    state.busy = false;
  }
}

async function submitPapers(form: HTMLFormElement): Promise<void> {
  const nameInput = form.elements.namedItem('name');
  const vehicleInput = form.elements.namedItem('vehicle');
  const name = nameInput instanceof HTMLInputElement ? nameInput.value.trim() : '';
  const vehicle = vehicleInput instanceof HTMLInputElement ? vehicleInput.value.trim() : '';
  if (name.length < 2) {
    showError('Enter the name.');
    return;
  }
  if (!vehicle) {
    showError('Enter the vehicle number from the RC.');
    return;
  }
  const kinds = ['aadhaar', 'licence', 'rc'] as const;
  for (const kind of kinds) {
    const onFile = state.profile?.vehicle_number === vehicle.replace(/[^A-Za-z0-9]/g, '').toUpperCase() && state.profile.documents[kind].on_file;
    if (!files[kind] && !onFile) {
      showError('Add the Aadhaar, driving licence, and vehicle RC.');
      return;
    }
  }
  const button = form.querySelector('button[type="submit"]');
  if (button instanceof HTMLButtonElement) {
    button.disabled = true;
  }
  try {
    state.vehicle = vehicle;
    const documents: Record<string, StoredFile | undefined> = {};
    for (const kind of kinds) {
      const file = files[kind];
      if (file) {
        documents[kind] = await uploadKind(kind, file);
      }
    }
    state.profile = await saveProfile(state.token, vehicle, { name, vehicle_number: vehicle, documents });
    state.vehicle = state.profile.vehicle_number;
    writeSession();
    for (const kind of kinds) {
      files[kind] = null;
    }
    state.error = '';
    await openScreen('requests');
  } catch (error) {
    if (button instanceof HTMLButtonElement) {
      button.disabled = false;
    }
    catchError(error);
  }
}

async function acceptIds(ids: string[]): Promise<void> {
  if (!state.profile?.ready) {
    showError('Save the papers first.');
    return;
  }
  try {
    for (const id of ids) {
      await acceptRequest(state.token, state.vehicle, id);
      state.selected.delete(id);
    }
    state.error = '';
    await loadRows();
    paintStack();
  } catch (error) {
    catchError(error);
    if (!keepPortal(state.token)) {
      return;
    }
    try {
      await loadRows();
      paintStack();
    } catch (refreshError) {
      catchError(refreshError);
    }
  }
}

function pick(group: string, value: string): void {
  if (group === 'location') {
    state.location = value;
  }
  if (group === 'bucket') {
    state.bucket = value;
  }
  document.querySelectorAll(`[data-group="${group}"]`).forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }
    const on = node.dataset.value === value;
    node.setAttribute('aria-pressed', on ? 'true' : 'false');
    node.classList.toggle('on', on);
  });
}

function onClick(event: Event): void {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  const element = target.closest('[data-action]');
  if (!(element instanceof HTMLElement)) {
    return;
  }
  const action = element.dataset.action;
  if (action === 'close-theme') {
    if (event.target !== element) {
      return;
    }
    state.themeOpen = false;
    paintTheme();
    return;
  }
  if (action === 'theme') {
    state.themeOpen = true;
    paintTheme();
    return;
  }
  if (action === 'theme-choice' && element.dataset.id) {
    chooseTheme(element.dataset.id);
    paintTheme();
    return;
  }
  if (action === 'leave') {
    leave();
    return;
  }
  if (action === 'go' && element.dataset.screen) {
    const screen = element.dataset.screen;
    if (screen === 'raise' || screen === 'requests' || screen === 'papers' || screen === 'sheet') {
      void openScreen(screen);
    }
    return;
  }
  if (action === 'pick' && element.dataset.group && element.dataset.value) {
    pick(element.dataset.group, element.dataset.value);
    return;
  }
  if (action === 'span' && (element.dataset.value === 'week' || element.dataset.value === 'month')) {
    state.span = element.dataset.value;
    void openScreen('sheet');
    return;
  }
  if (action === 'accept' && element.dataset.id) {
    void acceptIds([element.dataset.id]);
    return;
  }
  if (action === 'accept-selected') {
    void acceptIds([...state.selected]);
    return;
  }
  if (action === 'complete' && element.dataset.id) {
    const id = element.dataset.id;
    void completeRequest(state.token, state.vehicle, id)
      .then(async () => {
        state.error = '';
        await loadRows();
        paintStack();
      })
      .catch((error: unknown) => catchError(error));
  }
}

function onSubmit(event: Event): void {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }
  event.preventDefault();
  if (form.id === 'gate') {
    void submitGate(form);
  } else if (form.id === 'raise') {
    void submitRaise(form);
  } else if (form.id === 'papers') {
    void submitPapers(form);
  }
}

function onChange(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  if (target.dataset.take) {
    if (target.checked) {
      state.selected.add(target.dataset.take);
    } else {
      state.selected.delete(target.dataset.take);
    }
    const stack = document.querySelector('#stack');
    const bar = acceptBar();
    const existing = stack?.querySelector('.accept-bar');
    if (existing) {
      existing.remove();
    }
    if (bar && stack) {
      stack.insertAdjacentHTML('beforeend', bar);
    }
    lastStack = stack instanceof HTMLElement ? stack.innerHTML : lastStack;
    return;
  }
  if (target.dataset.file) {
    void stageFile(target.dataset.file, target.files?.[0] ?? null);
  }
}

async function boot(): Promise<void> {
  applyTheme(currentTheme());
  const saved = readSession();
  if (!saved) {
    renderGate();
    return;
  }
  state.token = saved.token;
  state.role = saved.role;
  state.vehicle = saved.vehicle;
  try {
    if (state.role === 'receiver' && state.vehicle) {
      state.profile = await profile(state.token, state.vehicle);
    }
    state.screen = homeScreen();
    if (state.screen === 'requests') {
      await loadRows();
    }
    if (state.screen === 'sheet') {
      await loadAdmin();
    }
    renderShell();
  } catch (error) {
    catchError(error);
    if (state.token) {
      renderShell();
    }
  }
}

document.body.addEventListener('click', onClick);
document.body.addEventListener('submit', onSubmit);
document.body.addEventListener('change', onChange);
window.setInterval(() => tick(), 1000);
window.setInterval(() => {
  if (!state.token || document.hidden) {
    return;
  }
  if (state.screen === 'requests') {
    void loadRows()
      .then(() => paintStack())
      .catch((error: unknown) => catchError(error));
  }
  if (state.screen === 'sheet') {
    const before = JSON.stringify(state.sheet);
    void loadAdmin()
      .then(() => {
        if (JSON.stringify(state.sheet) !== before) {
          renderShell();
        }
      })
      .catch((error: unknown) => catchError(error));
  }
}, 4000);

void boot();
