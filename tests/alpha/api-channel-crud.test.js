const express = require('express');
const request = require('supertest');
const api = require('../../src/api');

function collection(rows = []) {
  return {
    find: () => rows,
    update: () => {},
    save: () => {},
    remove: () => {},
    load: () => {},
  };
}

function createApp() {
  const channels = new Map([
    [
      1,
      {
        number: 1,
        name: 'Existing Channel',
        programs: [],
        fallback: [],
      },
    ],
  ]);

  const channelService = {
    getAllChannelNumbers: async () => Array.from(channels.keys()),
    getChannel: async (number) => channels.get(number) || null,
    saveChannel: async (number, channel) => {
      channels.set(number, channel);
    },
    deleteChannel: async (number) => {
      channels.delete(number);
    },
  };

  const db = new Proxy(
    {},
    {
      get: () => collection([{ _id: 'fixture', ffmpegPath: 'ffmpeg' }]),
    }
  );

  const app = express();
  app.use(express.json());
  app.use(
    api.router(
      db,
      channelService,
      {
        getAllFillersInfo: async () => [],
        getFiller: async () => null,
        saveFiller: async () => {},
        createFiller: async () => 'fixture',
        deleteFiller: async () => {},
        getFillerChannels: async () => [],
      },
      {
        getAllShowsInfo: async () => [],
        getShow: async () => null,
        saveShow: async () => {},
        createShow: async () => 'fixture',
        deleteShow: async () => {},
      },
      {
        lastUpdated: new Date(0),
        updateXML: () => {},
        restartInterval: () => {},
      },
      {
        get: async () => ({}),
        getStatus: async () => ({}),
        getChannelLineup: async () => [],
      },
      {
        getChannelList: async () => '',
      },
      {
        push: () => {},
      },
      {
        get: () => ({ ffmpegPath: 'ffmpeg' }),
        update: () => ({ ffmpeg: { ffmpegPath: 'ffmpeg' } }),
        reset: () => ({ ffmpegPath: 'ffmpeg' }),
      }
    )
  );

  return app;
}

describe('src/api.js channel CRUD baseline', () => {
  test('lists channel numbers', async () => {
    const response = await request(createApp()).get('/api/channels');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([1]);
  });

  test('reads an existing channel by number', async () => {
    const response = await request(createApp()).get('/api/channel/1');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      number: 1,
      name: 'Existing Channel',
    });
  });

  test('creates and updates a channel through the legacy channel route', async () => {
    const app = createApp();
    const createdChannel = {
      number: 7,
      name: 'Created Channel',
      programs: [],
      fallback: [],
    };
    const updatedChannel = {
      ...createdChannel,
      name: 'Updated Channel',
    };

    const createResponse = await request(app)
      .post('/api/channel')
      .send(createdChannel);
    const createdReadResponse = await request(app).get('/api/channel/7');
    const updateResponse = await request(app)
      .put('/api/channel')
      .send(updatedChannel);
    const updatedReadResponse = await request(app).get('/api/channel/7');

    expect(createResponse.status).toBe(200);
    expect(createResponse.body).toEqual({ number: 7 });
    expect(createdReadResponse.body).toMatchObject(createdChannel);
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toEqual({ number: 7 });
    expect(updatedReadResponse.body).toMatchObject(updatedChannel);
  });

  test('deletes a channel by number', async () => {
    const app = createApp();

    const deleteResponse = await request(app)
      .delete('/api/channel')
      .send({ number: 1 });
    const readResponse = await request(app).get('/api/channel/1');

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toEqual({ number: 1 });
    expect(readResponse.status).toBe(404);
  });
});
