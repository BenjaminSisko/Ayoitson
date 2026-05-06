// src/lib/debounce.js
//
// Trailing-edge debounce for Node. Coalesces N rapid calls into a single
// invocation after `wait` ms of quiet. Used to deduplicate the TV-guide
// regeneration burst when an operator edits 50 channels in quick succession.
//
// Closes BUG-TODO-DEBOUNCE (was a stale `//TODO: this could be smarter…`
// at index.js:243).
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

'use strict';

/**
 * Returns a function that delays calling `fn` until `waitMs` have passed
 * without another call. Subsequent calls within the window reset the timer.
 *
 * The wrapped function:
 *   - Returns nothing (fire-and-forget).
 *   - Drops all but the most-recent set of arguments — that's the point.
 *   - Exposes `.flush()` to invoke immediately and `.cancel()` to drop the
 *     pending call.
 */
function debounce(fn, waitMs) {
  if (typeof fn !== 'function') {
    throw new TypeError('debounce: fn must be a function');
  }
  if (!Number.isFinite(waitMs) || waitMs < 0) {
    throw new TypeError('debounce: waitMs must be a non-negative number');
  }

  let timer = null;
  let lastArgs = null;
  let lastThis = null;

  function fire() {
    timer = null;
    const args = lastArgs;
    const ctx = lastThis;
    lastArgs = null;
    lastThis = null;
    try {
      fn.apply(ctx, args || []);
    } catch (err) {
      // Trailing-edge invocations have no caller waiting on them — log and
      // swallow so a thrown error doesn't blow out the timer queue.
      console.error('debounce: handler threw', err);
    }
  }

  function debounced(...args) {
    lastArgs = args;
    lastThis = this;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(fire, waitMs);
  }

  debounced.flush = function flush() {
    if (timer !== null) {
      clearTimeout(timer);
      fire();
    }
  };

  debounced.cancel = function cancel() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
      lastArgs = null;
      lastThis = null;
    }
  };

  return debounced;
}

module.exports = { debounce };
