const { expect, test } = require('@playwright/test');

test('Playwright runner is wired into the Phase 1 test gate', async () => {
  expect(process.version).toMatch(/^v\d+\./);
});
