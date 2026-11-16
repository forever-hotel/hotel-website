import assert from 'node:assert/strict';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { focusKeyboardButton } from './keyboard-focus.mjs';

function fixture({
  stealFocus = false,
  disabled = false,
  hydrated = true,
} = {}) {
  const document = { activeElement: null, querySelectorAll: () => [button] };
  const button = {
    textContent: 'Check price and continue',
    disabled,
    isConnected: true,
    ...(hydrated ? { __reactProps$fixture: {} } : {}),
    focus() {
      document.activeElement = button;
    },
  };
  let frames = 0;
  const requestAnimationFrame = (callback) => {
    if (++frames === 1 && stealFocus)
      document.activeElement = { tagName: 'H1' };
    callback();
  };
  return { document, requestAnimationFrame };
}

const focus = (context, label = 'Check price and continue') =>
  runInNewContext(
    `(${focusKeyboardButton.toString()})(${JSON.stringify(label)})`,
    context,
  );

test('keyboard activation waits when a navigation effect steals button focus', async () => {
  const context = fixture({ stealFocus: true });
  assert.equal(await focus(context), false);
  // The caller retries focusing, not the submission or Enter key.
  assert.equal(await focus(context), true);
});

test('keyboard activation accepts a hydrated enabled button with settled focus', async () => {
  assert.equal(await focus(fixture()), true);
});

test('keyboard activation rejects missing, disabled and unhydrated controls', async () => {
  assert.equal(await focus(fixture(), 'Missing'), false);
  assert.equal(await focus(fixture({ disabled: true })), false);
  assert.equal(await focus(fixture({ hydrated: false })), false);
});
