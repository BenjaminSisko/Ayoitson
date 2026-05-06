// @ts-nocheck
const events = require('events');
const channelCache = require('../channel-cache');
const { validateWatermark } = require('../lib/watermark-validator');

class ChannelService extends events.EventEmitter {
  constructor(channelDB) {
    super();
    this.channelDB = channelDB;
    this.onDemandService = null;
  }

  setOnDemandService(onDemandService) {
    this.onDemandService = onDemandService;
  }

  async saveChannel(number, channelJson, options) {
    let channel = cleanUpChannel({
      ...(channelJson || {}),
      number: Number(number),
    });
    if (channel.watermark && channel.watermark.enabled === true) {
      await validateWatermark(channel.watermark);
    }
    let ignoreOnDemand = true;
    if (
      this.onDemandService != null &&
      (typeof options === 'undefined' || options.ignoreOnDemand !== true)
    ) {
      ignoreOnDemand = false;
      this.onDemandService.fixupChannelBeforeSave(channel);
    }
    channelCache.saveChannelConfig(number, channel);
    await this.channelDB.saveChannel(number, channel);

    this.emit('channel-update', {
      channelNumber: number,
      channel: channel,
      ignoreOnDemand: ignoreOnDemand,
    });
  }

  async deleteChannel(number) {
    await this.channelDB.deleteChannel(number);
    this.emit('channel-update', { channelNumber: number, channel: null });

    channelCache.clear();
  }

  async getChannel(number) {
    let lis = await channelCache.getChannelConfig(this.channelDB, number);
    if (lis == null || lis.length !== 1) {
      return null;
    }
    return lis[0];
  }

  async getAllChannelNumbers() {
    return await channelCache.getAllNumbers(this.channelDB);
  }

  async getAllChannels() {
    return await channelCache.getAllChannels(this.channelDB);
  }
}

function cleanUpProgram(program) {
  delete program.start;
  delete program.stop;
  delete program.streams;
  delete program.durationStr;
  delete program.commercials;
  if (typeof program.duration === 'undefined' || program.duration <= 0) {
    console.error(
      `Input contained a program with invalid duration: ${program.duration}. This program has been deleted`
    );
    return [];
  }
  if (!Number.isInteger(program.duration)) {
    console.error(
      `Input contained a program with invalid duration: ${program.duration}. Duration got fixed to be integer.`
    );
    program.duration = Math.ceil(program.duration);
  }
  return [program];
}

function cleanUpChannel(channel) {
  if (!Array.isArray(channel.programs)) {
    channel.programs = [];
  }
  if (!Array.isArray(channel.fallback)) {
    channel.fallback = [];
  }
  if (
    (typeof channel.name !== 'string' || channel.name.trim() === '') &&
    Number.isInteger(channel.number)
  ) {
    channel.name = `Channel ${channel.number}`;
  }
  if (typeof channel.groupTitle === 'undefined' || channel.groupTitle === '') {
    channel.groupTitle = 'Ayoitson';
  }
  channel.programs = channel.programs.flatMap(cleanUpProgram);
  delete channel.fillerContent;
  delete channel.filler;
  channel.fallback = channel.fallback.flatMap(cleanUpProgram);
  channel.duration = 0;
  for (let i = 0; i < channel.programs.length; i++) {
    channel.duration += channel.programs[i].duration;
  }
  return channel;
}

module.exports = ChannelService;
