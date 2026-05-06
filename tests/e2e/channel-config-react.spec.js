const path = require('path');
const { URL } = require('url');
const { expect, test } = require('@playwright/test');

let viteServer;
let baseURL;

test.beforeAll(async () => {
  const { createServer } = await import('vite');
  viteServer = await createServer({
    configFile: path.resolve(__dirname, '../../web/vite.config.ts'),
    logLevel: 'error',
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
    },
  });
  await viteServer.listen();
  const urls = viteServer.resolvedUrls.local;
  baseURL = new URL(urls.find((url) => url.includes('127.0.0.1')) || urls[0])
    .origin;
});

test.afterAll(async () => {
  await viteServer.close();
});

test('React channel config edits, reorders, saves, and reloads channel 1', async ({
  page,
}) => {
  let savedChannel = {
    number: 1,
    name: 'Original Channel',
    groupTitle: 'Ayoitson',
    icon: '',
    startTime: '2026-01-01T00:00:00.000Z',
    programs: [
      { title: 'Pilot', duration: 60000 },
      { title: 'Episode 2', duration: 60000 },
    ],
    fallback: [],
    fillerCollections: [],
    fillerRepeatCooldown: 1800000,
    watermark: { enabled: false },
    transcoding: { targetResolution: '' },
    onDemand: { isOnDemand: false, modulo: 1 },
  };

  await page.addInitScript(() => {
    window.localStorage.setItem(
      'ayoitson-auth',
      JSON.stringify({ state: { apiKey: 'test-key' }, version: 0 })
    );
  });
  await page.route('**/api/**', (route) => fulfillJson(route, {}));
  await page.route('**/api/filler-lists', (route) => fulfillJson(route, []));
  await page.route('**/api/channels/1', async (route) => {
    const request = route.request();
    if (request.method() === 'PUT') {
      savedChannel = JSON.parse(request.postData() || '{}');
      await fulfillJson(route, { number: 1 });
      return;
    }

    await fulfillJson(route, savedChannel);
  });

  await page.goto(`${baseURL}/v2/settings`);
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.goto(`${baseURL}/v2/channels/1`);

  await expect(page.getByLabel('Channel name')).toHaveValue('Original Channel');
  await page.getByLabel('Channel name').fill('Updated Channel');
  await page.getByRole('button', { name: 'Offline' }).click();
  await page.getByRole('button', { name: /move offline block up/i }).click();
  await page.getByRole('button', { name: /move offline block up/i }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  await expect.poll(() => savedChannel.name).toBe('Updated Channel');
  expect(savedChannel.programs[0]).toMatchObject({
    title: 'Offline block',
    isOffline: true,
  });

  await page.reload();

  await expect(page.getByLabel('Channel name')).toHaveValue('Updated Channel');
  await expect(
    page.getByRole('article', { name: /program 1: offline block/i })
  ).toBeVisible();
});

async function fulfillJson(route, body) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}
