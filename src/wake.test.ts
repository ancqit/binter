import assert from 'node:assert/strict';
import test from 'node:test';
import { HEALTH_EVERY_MS, armWake, HERBACK_HEALTH, type WakeTarget } from './wake.ts';

function target(): WakeTarget & { visibilityState: DocumentVisibilityState; fire(): void } {
  let listener = (): void => undefined;
  const page = {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener(_type: 'visibilitychange', next: () => void) {
      listener = next;
    },
    fire() {
      listener();
    },
  };
  return page;
}

test('opening the page calls herback health at once', async () => {
  const calls: Array<{ url: string; cache?: RequestCache }> = [];
  const page = target();
  const stop = armWake(page, async (url, init) => {
    calls.push({ url, cache: init?.cache });
    return new Response('ok');
  });
  stop();
  await Promise.resolve();
  assert.deepEqual(calls, [{ url: HERBACK_HEALTH, cache: 'no-store' }]);
});

test('an open page calls herback health again after 60 seconds', async () => {
  const calls: string[] = [];
  const queued: Array<() => void> = [];
  const original = globalThis.setInterval;
  globalThis.setInterval = ((fn: () => void) => {
    queued.push(fn);
    return 0 as unknown as ReturnType<typeof setInterval>;
  }) as typeof setInterval;
  try {
    const stop = armWake(target(), async (url) => {
      calls.push(url);
      return new Response('ok');
    });
    assert.equal(queued.length, 1);
    assert.equal(HEALTH_EVERY_MS, 60_000);
    queued[0]();
    stop();
  } finally {
    globalThis.setInterval = original;
  }
  await Promise.resolve();
  assert.deepEqual(calls, [HERBACK_HEALTH, HERBACK_HEALTH]);
});

test('coming back to the page calls herback again', async () => {
  const calls: string[] = [];
  const page = target();
  const stop = armWake(page, async (url) => {
    calls.push(url);
    return new Response('ok');
  });
  page.visibilityState = 'hidden';
  page.fire();
  page.visibilityState = 'visible';
  page.fire();
  stop();
  await Promise.resolve();
  assert.deepEqual(calls, [HERBACK_HEALTH, HERBACK_HEALTH]);
});

test('a sleeping herback does not stop the page', () => {
  assert.doesNotThrow(() => {
    const stop = armWake(target(), () => Promise.reject(new Error('offline')));
    stop();
  });
});
