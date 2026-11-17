import assert from 'node:assert/strict';
import test from 'node:test';
import { HEALTH_EVERY_MS, HERBACK_HEALTH, armWake, type WakeTarget } from './wake.ts';

function page(): WakeTarget & { visibilityState: DocumentVisibilityState; fire(): void } {
  let listener = (): void => undefined;
  return {
    visibilityState: 'visible',
    addEventListener(_type: 'visibilitychange', next: () => void) {
      listener = next;
    },
    fire() {
      listener();
    },
  };
}

test('a portal pings herback health as soon as it opens', async () => {
  const calls: Array<{ url: string; cache?: RequestCache }> = [];
  const stop = armWake(page(), async (url, init) => {
    calls.push({ url, cache: init?.cache });
    return new Response('ok');
  });
  stop();
  await Promise.resolve();
  assert.deepEqual(calls, [{ url: HERBACK_HEALTH, cache: 'no-store' }]);
  assert.equal(HERBACK_HEALTH, '/api/health');
  assert.equal(HEALTH_EVERY_MS, 60_000);
});

test('a portal pings herback health again after 60 seconds', async () => {
  const calls: string[] = [];
  const queued: Array<() => void> = [];
  const original = globalThis.setInterval;
  globalThis.setInterval = ((fn: () => void) => {
    queued.push(fn);
    return 0 as unknown as ReturnType<typeof setInterval>;
  }) as typeof setInterval;
  try {
    const stop = armWake(page(), async (url) => {
      calls.push(url);
      return new Response('ok');
    });
    assert.equal(queued.length, 1);
    queued[0]();
    stop();
  } finally {
    globalThis.setInterval = original;
  }
  await Promise.resolve();
  assert.deepEqual(calls, [HERBACK_HEALTH, HERBACK_HEALTH]);
});

test('a portal pings herback health again when the page becomes visible', async () => {
  const calls: string[] = [];
  const view = page();
  const stop = armWake(view, async (url) => {
    calls.push(url);
    return new Response('ok');
  });
  view.visibilityState = 'hidden';
  view.fire();
  view.visibilityState = 'visible';
  view.fire();
  stop();
  await Promise.resolve();
  assert.deepEqual(calls, [HERBACK_HEALTH, HERBACK_HEALTH]);
});

test('a sleeping herback does not stop the portal', () => {
  assert.doesNotThrow(() => {
    const stop = armWake(page(), () => Promise.reject(new Error('offline')));
    stop();
  });
});
