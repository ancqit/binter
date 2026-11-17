/** Same-origin `/api` is rewritten to herback. Render sleeps until something calls it. */
export const HERBACK_HEALTH = '/api/health';

/** Herback is checked once a minute while a portal stays open. */
export const HEALTH_EVERY_MS = 60_000;

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface WakeTarget {
  visibilityState: DocumentVisibilityState;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
}

export function wakeHerback(fetchImpl: FetchLike = fetch): void {
  void fetchImpl(HERBACK_HEALTH, { method: 'GET', cache: 'no-store' }).catch(() => undefined);
}

/** Call herback now, again each minute, and again when this page becomes visible. */
export function armWake(target: WakeTarget = document, fetchImpl: FetchLike = fetch): () => void {
  wakeHerback(fetchImpl);
  const timer = setInterval(() => wakeHerback(fetchImpl), HEALTH_EVERY_MS);
  const onVisible = (): void => {
    if (target.visibilityState === 'visible') {
      wakeHerback(fetchImpl);
    }
  };
  target.addEventListener('visibilitychange', onVisible);
  return () => clearInterval(timer);
}
