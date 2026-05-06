const { httpGet, httpPost } = require('./lib/http');
const constants = require('./constants');
const { getProcessClientIdentifier } = require('./lib/client-identifier');

function appendQuery(url, query = {}) {
  const target = new URL(url);

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'undefined' || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => target.searchParams.append(key, entry));
    } else {
      target.searchParams.set(key, value);
    }
  }

  return target.toString();
}

function signInBody(username, password) {
  const body = new URLSearchParams();
  body.set('user[login]', username);
  body.set('user[password]', password);
  return body.toString();
}

class Plex {
  constructor(opts) {
    this._accessToken =
      typeof opts.accessToken !== 'undefined' ? opts.accessToken : '';
    let uri = 'http://127.0.0.1:32400';
    if (typeof opts.uri !== 'undefined') {
      uri = opts.uri;
      if (uri.endsWith('/')) {
        uri = uri.slice(0, uri.length - 1);
      }
    }
    this._server = {
      uri: uri,
      host: typeof opts.host !== 'undefined' ? opts.host : '127.0.0.1',
      port: typeof opts.port !== 'undefined' ? opts.port : '32400',
      protocol: typeof opts.protocol !== 'undefined' ? opts.protocol : 'http',
    };
    this._headers = {
      Accept: 'application/json',
      'X-Plex-Device': constants.APP_NAME,
      'X-Plex-Device-Name': constants.APP_NAME,
      'X-Plex-Product': constants.APP_NAME,
      'X-Plex-Version': '0.1',
      'X-Plex-Client-Identifier':
        opts.clientIdentifier || opts.clientId || getProcessClientIdentifier(),
      'X-Plex-Platform': 'Chrome',
      'X-Plex-Platform-Version': '80.0',
    };
    this._httpOptions = {
      allowlist: opts.allowlist,
      databaseDir: opts.databaseDir,
      fetchImpl: opts.fetchImpl,
      maxBytes: opts.maxBytes,
      resolveHost: opts.resolveHost,
      signal: opts.signal,
      timeoutMs: opts.timeoutMs,
    };
  }

  get URL() {
    return `${this._server.uri}`;
  }

  async SignIn(username, password) {
    if (typeof username === 'undefined' || typeof password === 'undefined') {
      throw "Plex 'SignIn' Error - No Username or Password was provided to sign in.";
    }

    try {
      const res = await httpPost('https://plex.tv/users/sign_in.json', {
        ...this.getHttpOptions(),
        body: signInBody(username, password),
        headers: {
          ...this._headers,
          'content-type': 'application/x-www-form-urlencoded',
        },
      });
      if (res.status !== 201) {
        throw Error('Unexpected Plex sign-in status');
      }

      this._accessToken = res.data.user.authToken;
      return { accessToken: this._accessToken };
    } catch (err) {
      throw "Plex 'SignIn' Error - Username/Email and Password is incorrect!.";
    }
  }

  getHttpOptions(overrides = {}) {
    const allowlist = [
      this.URL,
      ...(Array.isArray(this._httpOptions.allowlist)
        ? this._httpOptions.allowlist
        : []),
    ];

    return {
      ...this._httpOptions,
      ...overrides,
      allowlist,
    };
  }

  async doRequest(req) {
    const method = req.method.toUpperCase();
    const url = appendQuery(req.url, req.qs);
    const options = this.getHttpOptions({
      headers: req.headers,
      method,
    });
    const response =
      method === 'GET'
        ? await httpGet(url, options)
        : await httpPost(url, options);

    if (response.status < 200 || response.status >= 300) {
      throw Error(`Request returned status code ${response.status}`);
    }

    return {
      body: response.text,
      headers: response.headers,
      statusCode: response.status,
      statusMessage: response.statusText,
    };
  }

  async Get(path, optionalHeaders = {}) {
    let req = {
      method: 'get',
      url: `${this.URL}${path}`,
      headers: this._headers,
      jar: false,
    };
    Object.assign(req, optionalHeaders);
    req.headers['X-Plex-Token'] = this._accessToken;
    if (this._accessToken === '') {
      throw Error(
        'No Plex token provided. Please use the SignIn method or provide a X-Plex-Token in the Plex constructor.'
      );
    } else {
      let res = await this.doRequest(req);
      return JSON.parse(res.body).MediaContainer;
    }
  }
  async Put(path, query = {}, optionalHeaders = {}) {
    var req = {
      method: 'put',
      url: `${this.URL}${path}`,
      headers: this._headers,
      qs: query,
      jar: false,
    };
    Object.assign(req, optionalHeaders);
    req.headers['X-Plex-Token'] = this._accessToken;
    if (this._accessToken === '') {
      throw Error(
        'No Plex token provided. Please use the SignIn method or provide a X-Plex-Token in the Plex constructor.'
      );
    }

    const res = await this.doRequest(req);
    if (res.statusCode !== 200) {
      throw Error(`Plex 'Put' request failed. URL: ${this.URL}${path}`);
    }

    return res.body;
  }
  async Post(path, query = {}, optionalHeaders = {}) {
    var req = {
      method: 'post',
      url: `${this.URL}${path}`,
      headers: this._headers,
      qs: query,
      jar: false,
    };
    Object.assign(req, optionalHeaders);
    req.headers['X-Plex-Token'] = this._accessToken;
    if (this._accessToken === '') {
      throw Error(
        'No Plex token provided. Please use the SignIn method or provide a X-Plex-Token in the Plex constructor.'
      );
    }

    const res = await this.doRequest(req);
    if (res.statusCode !== 200) {
      throw Error(`Plex 'Post' request failed. URL: ${this.URL}${path}`);
    }

    return res.body;
  }
  async checkServerStatus() {
    try {
      await this.Get('/');
      return 1;
    } catch (err) {
      console.error('Error getting Plex server status', err);
      return -1;
    }
  }
  async GetDVRS() {
    try {
      var result = await this.Get('/livetv/dvrs');
      var dvrs = result.Dvr;
      dvrs = typeof dvrs === 'undefined' ? [] : dvrs;
      return dvrs;
    } catch (err) {
      throw Error('GET /livetv/drs failed: ' + err.message);
    }
  }
  async RefreshGuide(_dvrs) {
    try {
      var dvrs = typeof _dvrs !== 'undefined' ? _dvrs : await this.GetDVRS();
      for (var i = 0; i < dvrs.length; i++) {
        await this.Post(`/livetv/dvrs/${dvrs[i].key}/reloadGuide`);
      }
    } catch (err) {
      throw Error('Zort', err);
    }
  }
  async RefreshChannels(channels, _dvrs) {
    var dvrs = typeof _dvrs !== 'undefined' ? _dvrs : await this.GetDVRS();
    var _channels = [];
    let qs = {};
    for (var i = 0; i < channels.length; i++) {
      _channels.push(channels[i].number);
    }
    qs.channelsEnabled = _channels.join(',');
    for (var i = 0; i < _channels.length; i++) {
      qs[`channelMapping[${_channels[i]}]`] = _channels[i];
      qs[`channelMappingByKey[${_channels[i]}]`] = _channels[i];
    }
    for (var i = 0; i < dvrs.length; i++) {
      for (var y = 0; y < dvrs[i].Device.length; y++) {
        await this.Put(
          `/media/grabbers/devices/${dvrs[i].Device[y].key}/channelmap`,
          qs
        );
      }
    }
  }
}

module.exports = Plex;
