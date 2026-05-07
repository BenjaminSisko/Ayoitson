const execFile = require('child_process').execFile;

class FFMPEGInfo {
  ffmpegPath: string;

  constructor(opts: { ffmpegPath: string }) {
    this.ffmpegPath = opts.ffmpegPath;
  }
  async getVersion() {
    try {
      let s = await new Promise<string>((resolve, reject) => {
        execFile(
          this.ffmpegPath,
          ['-version'],
          function (error: Error | null, stdout: string) {
            if (error !== null) {
              reject(error);
            } else {
              resolve(stdout);
            }
          }
        );
      });
      var m = s.match(/version\s+([^\s]+)\s+.*Copyright/);
      if (m == null) {
        console.error(
          'ffmpeg -version command output not in the expected format: ' + s
        );
        return 'Unknown';
      }
      return m[1];
    } catch (err) {
      console.error('Error getting ffmpeg version', err);
      return 'Error';
    }
  }
}

module.exports = FFMPEGInfo;
