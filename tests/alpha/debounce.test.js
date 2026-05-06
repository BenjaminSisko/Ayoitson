// tests/alpha/debounce.test.js
//
// BUG-TODO-DEBOUNCE: TV-guide regen used to fire on every channel save. The
// new debounce wrapper coalesces N rapid calls into one trailing-edge call.
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

const { debounce } = require('../../src/lib/debounce');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('debounce', () => {
  test('fires once after the trailing edge', async () => {
    let calls = 0;
    const d = debounce(() => {
      calls += 1;
    }, 30);
    for (let i = 0; i < 10; i += 1) d();
    expect(calls).toBe(0);
    await wait(60);
    expect(calls).toBe(1);
  });

  test('passes the most-recent args', async () => {
    const seen = [];
    const d = debounce((x) => {
      seen.push(x);
    }, 20);
    d(1);
    d(2);
    d(3);
    await wait(50);
    expect(seen).toEqual([3]);
  });

  test('cancel drops the pending call', async () => {
    let calls = 0;
    const d = debounce(() => {
      calls += 1;
    }, 30);
    d();
    d.cancel();
    await wait(50);
    expect(calls).toBe(0);
  });

  test('flush invokes immediately', () => {
    let calls = 0;
    const d = debounce(() => {
      calls += 1;
    }, 100);
    d();
    d.flush();
    expect(calls).toBe(1);
  });

  test('rejects bad inputs', () => {
    expect(() => debounce('nope', 10)).toThrow();
    expect(() => debounce(() => {}, -1)).toThrow();
  });
});
