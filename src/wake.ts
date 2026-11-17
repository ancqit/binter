/** Same-origin /api. Vercel and vite strip it, and herback answers /health. */
export const HERBACK_HEALTH = '/api/health';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface WakeTarget {
  visibilityState: DocumentVisibilityState;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
}

export function wakeHerback(fetchImpl: FetchLike = fetch): void {
  void fetchImpl(HERBACK_HEALTH, { method: 'GET', cache: 'no-store' }).catch(() => undefined);
}

/** Call herback now, and again each time this page becomes visible. */
export function armWake(target: WakeTarget = document, fetchImpl: FetchLike = fetch): void {
  wakeHerback(fetchImpl);
  target.addEventListener('visibilitychange', () => {
    if (target.visibilityState === 'visible') {
      wakeHerback(fetchImpl);
    }
  });
}
