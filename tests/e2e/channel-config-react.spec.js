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

test('React root SPA covers login, settings, channels, guide, library, and channel editor', async ({
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

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/api/api-keys') {
      await fulfillJson(route, [
        {
          id: 'key-1',
          name: 'master',
          scopes: ['*'],
          createdAt: '2026-05-06T00:00:00.000Z',
          lastUsedAt: null,
          revokedAt: null,
        },
      ]);
      return;
    }

    if (url.pathname === '/api/settings/ffmpeg') {
      await fulfillJson(route, {
        ffmpegPath: '/opt/homebrew/bin/ffmpeg',
        enableFFMPEGTranscoding: true,
        videoEncoder: 'libx264',
        audioEncoder: 'aac',
        targetResolution: '1920x1080',
      });
      return;
    }

    if (url.pathname === '/api/settings/xmltv') {
      await fulfillJson(route, { refresh: 4, cache: 48, imageCache: true });
      return;
    }

    if (url.pathname === '/api/xmltv-settings') {
      await fulfillJson(route, {
        file: '/Users/operator/.ayoitson/xmltv.xml',
        xmltvUrl: 'http://127.0.0.1:8000/api/guide/xmltv.xml',
        m3uUrl: 'http://127.0.0.1:8000/api/guide/channels.m3u',
      });
      return;
    }

    if (url.pathname === '/api/settings/hdhr') {
      await fulfillJson(route, {
        tunerCount: 2,
        autoDiscoveryEnabled: false,
      });
      return;
    }

    if (url.pathname === '/api/plex-servers') {
      await fulfillJson(route, []);
      return;
    }

    if (url.pathname === '/api/filler-lists') {
      await fulfillJson(route, []);
      return;
    }

    if (url.pathname === '/api/channels') {
      await fulfillJson(route, [
        { number: 1, name: savedChannel.name, groupTitle: 'Ayoitson' },
      ]);
      return;
    }

    if (url.pathname === '/api/channels/1') {
      if (request.method() === 'PUT') {
        savedChannel = JSON.parse(request.postData() || '{}');
        await fulfillJson(route, { number: 1 });
        return;
      }

      await fulfillJson(route, savedChannel);
      return;
    }

    if (url.pathname === '/api/guide/channels/1') {
      await fulfillJson(route, {
        name: savedChannel.name,
        programs: [
          {
            id: 'pilot',
            title: savedChannel.programs[0]?.title || 'Pilot',
            start: '2026-05-06T12:00:00.000Z',
            stop: '2026-05-06T12:30:00.000Z',
          },
        ],
      });
      return;
    }

    await fulfillJson(route, {});
  });

  await page.goto(`${baseURL}/settings`);
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Connect to Ayoitson' })
  ).toBeVisible();
  await page.getByLabel('Existing API key').fill('test-key');
  await page.getByRole('button', { name: /use key/i }).click();

  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByText('master')).toBeVisible();

  await page.getByRole('button', { name: 'Channels' }).click();
  await expect(page).toHaveURL(/\/channels$/);
  await expect(
    page.getByRole('heading', { name: 'Broadcast Inventory' })
  ).toBeVisible();
  await expect(page.getByText('Original Channel')).toBeVisible();

  await page.getByRole('button', { name: 'Guide' }).click();
  await expect(page).toHaveURL(/\/guide$/);
  await expect(
    page.getByRole('heading', { name: 'Guide Viewer' })
  ).toBeVisible();
  await expect(page.getByText('Pilot')).toBeVisible();

  await page.getByRole('button', { name: 'Plex' }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByText('No Plex servers yet.')).toBeVisible();

  await page.goto(`${baseURL}/channels/1`);

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
