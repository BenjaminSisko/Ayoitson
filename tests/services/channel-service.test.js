const channelCache = require('../../src/channel-cache');
const ChannelService = require('../../src/services/channel-service');

describe('ChannelService', () => {
  afterEach(() => {
    channelCache.clear();
  });

  test('normalizes number-only channel creates into an empty playable channel', async () => {
    const channelDB = {
      saveChannel: vi.fn(async () => {}),
    };
    const service = new ChannelService(channelDB);
    const update = vi.fn();
    service.on('channel-update', update);

    await service.saveChannel(303, { number: 303 });

    const expectedChannel = {
      number: 303,
      name: 'Channel 303',
      groupTitle: 'Ayoitson',
      programs: [],
      fallback: [],
      duration: 0,
    };
    expect(channelDB.saveChannel).toHaveBeenCalledWith(303, expectedChannel);
    expect(update).toHaveBeenCalledWith({
      channelNumber: 303,
      channel: expectedChannel,
      ignoreOnDemand: true,
    });
  });
});
