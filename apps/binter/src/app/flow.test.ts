import assert from 'node:assert/strict';
import test from 'node:test';
import { keepPortal, paintAfterFailure } from './flow.ts';

test('a rejected number stays on the gate', () => {
  assert.equal(keepPortal(''), false);
  assert.equal(paintAfterFailure(''), 'gate');
});

test('a live number stays in the portal', () => {
  assert.equal(paintAfterFailure('notifier-number'), 'portal');
});

test('repeating a rejection does not bounce back into the portal', () => {
  let token = 'notifier-number';
  const paints: string[] = [];
  for (let step = 0; step < 8; step += 1) {
    token = '';
    paints.push(paintAfterFailure(token));
  }
  assert.deepEqual(paints, Array(8).fill('gate'));
});
