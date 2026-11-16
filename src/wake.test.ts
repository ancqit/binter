import assert from 'node:assert/strict';
import test from 'node:test';
import { armWake, HERBACK_HEALTH, type WakeTarget } from './wake.ts';

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
  armWake(page, async (url, init) => {
    calls.push({ url, cache: init?.cache });
    return new Response('ok');
  });
  await Promise.resolve();
  assert.deepEqual(calls, [{ url: HERBACK_HEALTH, cache: 'no-store' }]);
});

test('coming back to the page calls herback again', async () => {
  const calls: string[] = [];
  const page = target();
  armWake(page, async (url) => {
    calls.push(url);
    return new Response('ok');
  });
  page.visibilityState = 'hidden';
  page.fire();
  page.visibilityState = 'visible';
  page.fire();
  await Promise.resolve();
  assert.deepEqual(calls, [HERBACK_HEALTH, HERBACK_HEALTH]);
});

test('a sleeping herback does not stop the page', () => {
  assert.doesNotThrow(() =>
    armWake(target(), () => Promise.reject(new Error('offline'))),
  );
});
