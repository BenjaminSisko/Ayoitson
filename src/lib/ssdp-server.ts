// @ts-nocheck
const dgram = require('dgram');
const os = require('os');

const SSDP_ADDRESS = '239.255.255.250';
const SSDP_PORT = 1900;
const DEFAULT_MAX_AGE_SECONDS = 1800;

function createSsdpServer(options = {}) {
  return new MinimalSsdpServer(options);
}

class MinimalSsdpServer {
  constructor(options = {}) {
    this.location = options.location || {};
    this.udn = options.udn;
    this.allowWildcards = options.allowWildcards === true;
    this.ssdpSig = options.ssdpSig || 'Ayoitson UPnP/1.0';
    this.maxAgeSeconds = options.maxAgeSeconds || DEFAULT_MAX_AGE_SECONDS;
    this.usns = new Set();
    this.socket = null;
    this.started = false;
  }

  addUSN(usn) {
    if (typeof usn === 'string' && usn.length > 0) {
      this.usns.add(usn);
    }
  }

  start(callback) {
    if (this.started) {
      if (callback) callback();
      return;
    }

    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    this.socket = socket;

    socket.on('message', (message, rinfo) => {
      this.handleMessage(message, rinfo);
    });
    socket.on('error', (err) => {
      console.error('SSDP socket error.', err);
    });

    socket.bind(SSDP_PORT, () => {
      try {
        socket.addMembership(SSDP_ADDRESS);
        socket.setMulticastTTL(2);
      } catch (err) {
        console.error('Unable to join SSDP multicast group.', err);
      }
      this.started = true;
      this.advertise('ssdp:alive');
      if (callback) callback();
    });
  }

  stop(callback) {
    if (!this.socket) {
      if (callback) callback();
      return;
    }

    this.advertise('ssdp:byebye');
    this.socket.close(() => {
      this.started = false;
      this.socket = null;
      if (callback) callback();
    });
  }

  advertise(ntStatus) {
    if (!this.socket) return;

    for (const usn of this.usns) {
      const payload = [
        'NOTIFY * HTTP/1.1',
        `HOST: ${SSDP_ADDRESS}:${SSDP_PORT}`,
        `CACHE-CONTROL: max-age=${this.maxAgeSeconds}`,
        `LOCATION: ${this.resolveLocation()}`,
        `NT: ${usn}`,
        `NTS: ${ntStatus}`,
        `SERVER: ${this.ssdpSig}`,
        `USN: ${this.udn}::${usn}`,
        '',
        '',
      ].join('\r\n');
      this.socket.send(Buffer.from(payload), SSDP_PORT, SSDP_ADDRESS);
    }
  }

  handleMessage(message, rinfo) {
    const text = message.toString('utf8');
    if (!/^M-SEARCH \* HTTP\/1\.1/im.test(text)) {
      return;
    }

    const headers = parseSsdpHeaders(text);
    const st = headers.st || headers.ST;
    if (!this.matchesSearchTarget(st)) {
      return;
    }

    for (const usn of this.usns) {
      const payload = [
        'HTTP/1.1 200 OK',
        `CACHE-CONTROL: max-age=${this.maxAgeSeconds}`,
        'EXT:',
        `LOCATION: ${this.resolveLocation()}`,
        `SERVER: ${this.ssdpSig}`,
        `ST: ${usn}`,
        `USN: ${this.udn}::${usn}`,
        '',
        '',
      ].join('\r\n');
      this.socket.send(Buffer.from(payload), rinfo.port, rinfo.address);
    }
  }

  matchesSearchTarget(st) {
    if (!st) return false;
    if (this.usns.has(st)) return true;
    if (st === this.udn) return true;
    return this.allowWildcards && st === 'ssdp:all';
  }

  resolveLocation(preferredAddress) {
    const port = this.location.port || process.env.PORT || '8000';
    const urlPath = this.location.path || '/device.xml';
    const protocol = this.location.protocol || 'http';
    const host = preferredAddress || firstLanAddress() || '127.0.0.1';
    return `${protocol}://${host}:${port}${urlPath}`;
  }
}

function parseSsdpHeaders(text) {
  return text.split(/\r?\n/).reduce((headers, line) => {
    const index = line.indexOf(':');
    if (index > 0) {
      headers[line.slice(0, index).trim().toLowerCase()] = line
        .slice(index + 1)
        .trim();
    }
    return headers;
  }, {});
}

function firstLanAddress() {
  const interfaces = os.networkInterfaces();
  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses || []) {
      if (address.family === 'IPv4' && !address.internal) {
        return address.address;
      }
    }
  }
  return null;
}

module.exports = {
  DEFAULT_MAX_AGE_SECONDS,
  SSDP_ADDRESS,
  SSDP_PORT,
  createSsdpServer,
  parseSsdpHeaders,
};
