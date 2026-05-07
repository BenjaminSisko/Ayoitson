const events = require('events');
const {
  spawnFfmpeg,
  toSafeFfmpegArgs,
}: typeof import('./lib/ffmpeg-args') = require('./lib/ffmpeg-args');
const {
  cleanupDrawtextFiles,
  createDrawtextFile,
  escapeDrawtextLiteral,
} = require('./lib/ffmpeg-escape');

function getDatabaseDir() {
  return process.env.AYOITSON_DATABASE || process.env.DATABASE || '.ayoitson';
}

class FFMPEG_TEXT extends events.EventEmitter {
  drawtextFiles: string[];
  args: import('./lib/ffmpeg-args').SafeFFmpegArg[];
  ffmpeg: any;

  constructor(opts: any, title: string, subtitle: string) {
    super();
    this.drawtextFiles = [
      createDrawtextFile(title),
      createDrawtextFile(subtitle),
    ];
    this.args = toSafeFfmpegArgs([
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
      `drawtext=fontfile=${getDatabaseDir()}/font.ttf:fontsize=30:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:textfile='${escapeDrawtextLiteral(this.drawtextFiles[0])}',drawtext=fontfile=${getDatabaseDir()}/font.ttf:fontsize=20:fontcolor=white:x=(w-text_w)/2:y=(h+text_h+20)/2:textfile='${escapeDrawtextLiteral(this.drawtextFiles[1])}'`,
      '-c:v',
      opts.videoEncoder,
      '-c:a',
      opts.audioEncoder,
      '-f',
      'mpegts',
      'pipe:1',
    ]);

    this.ffmpeg = spawnFfmpeg(opts.ffmpegPath, this.args);

    this.ffmpeg.stdout.on('data', (chunk: Buffer) => {
      this.emit('data', chunk);
    });

    if (opts.logFfmpeg) {
      this.ffmpeg.stderr.on('data', (chunk: Buffer) => {
        process.stderr.write(chunk);
      });
    }

    this.ffmpeg.on('error', () => {
      this.cleanupDrawtextFiles();
    });

    this.ffmpeg.on('close', (code: number | null) => {
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
