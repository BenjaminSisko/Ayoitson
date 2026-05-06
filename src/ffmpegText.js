const spawn = require('child_process').spawn;
const events = require('events');
const {
  cleanupDrawtextFiles,
  createDrawtextFile,
  escapeDrawtextLiteral,
} = require('./lib/ffmpeg-escape');

class FFMPEG_TEXT extends events.EventEmitter {
  constructor(opts, title, subtitle) {
    super();
    this.drawtextFiles = [
      createDrawtextFile(title),
      createDrawtextFile(subtitle),
    ];
    this.args = [
      '-threads',
      opts.threads,
      '-f',
      'lavfi',
      '-re',
      '-stream_loop',
      '-1',
      '-i',
      `color=c=black:s=${opts.videoResolution}`,
      '-f',
      'lavfi',
      '-i',
      'anullsrc',
      '-vf',
      `drawtext=fontfile=${process.env.DATABASE}/font.ttf:fontsize=30:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:textfile='${escapeDrawtextLiteral(this.drawtextFiles[0])}',drawtext=fontfile=${process.env.DATABASE}/font.ttf:fontsize=20:fontcolor=white:x=(w-text_w)/2:y=(h+text_h+20)/2:textfile='${escapeDrawtextLiteral(this.drawtextFiles[1])}'`,
      '-c:v',
      opts.videoEncoder,
      '-c:a',
      opts.audioEncoder,
      '-f',
      'mpegts',
      'pipe:1',
    ];

    this.ffmpeg = spawn(opts.ffmpegPath, this.args);

    this.ffmpeg.stdout.on('data', (chunk) => {
      this.emit('data', chunk);
    });

    if (opts.logFfmpeg) {
      this.ffmpeg.stderr.on('data', (chunk) => {
        process.stderr.write(chunk);
      });
    }

    this.ffmpeg.on('error', () => {
      this.cleanupDrawtextFiles();
    });

    this.ffmpeg.on('close', (code) => {
      this.cleanupDrawtextFiles();
      if (code === null) this.emit('close', code);
      else if (code === 0) this.emit('close', code);
      else if (code === 255) this.emit('close', code);
      else
        this.emit('error', {
          code: code,
          cmd: `${opts.ffmpegPath} ${this.args.join(' ')}`,
        });
    });
  }
  cleanupDrawtextFiles() {
    cleanupDrawtextFiles(this.drawtextFiles);
  }
  kill() {
    this.ffmpeg.kill();
  }
}

module.exports = FFMPEG_TEXT;
