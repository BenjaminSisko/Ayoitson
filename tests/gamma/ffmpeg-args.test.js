const { makeSafeArg, toSafeFfmpegArgs } = require('../../src/lib/ffmpeg-args');

describe('SafeFFmpegArg helpers', () => {
  test('rejects nulls, newlines, shell control characters, and blocked protocols by default', () => {
    expect(() => makeSafeArg('good-value')).not.toThrow();
    expect(() => makeSafeArg('bad\0value')).toThrow(/null byte/);
    expect(() => makeSafeArg('bad\nvalue')).toThrow(/newline/);
    expect(() => makeSafeArg('bad|value')).toThrow(/shell control/);
    expect(() => makeSafeArg('file:/etc/passwd')).toThrow(/Blocked/);
    expect(() => makeSafeArg('https://media.example.test/video.ts')).toThrow(
      /Blocked/
    );
  });

  test('converts normal ffmpeg argv arrays without losing required protocol exceptions', () => {
    const args = toSafeFfmpegArgs([
      '-hide_banner',
      '-i',
      'https://media.example.test/video.ts',
      '-f',
      'mpegts',
      'pipe:1',
    ]);

    expect(args).toEqual([
      '-hide_banner',
      '-i',
      'https://media.example.test/video.ts',
      '-f',
      'mpegts',
      'pipe:1',
    ]);
  });

  test('keeps dangerous input protocols blocked at ffmpeg input positions', () => {
    expect(() => toSafeFfmpegArgs(['-i', 'file:/etc/passwd'])).toThrow(
      /Blocked/
    );
  });

  test('allows filter graphs and Plex headers only in their expected argument slots', () => {
    expect(() =>
      toSafeFfmpegArgs([
        '-filter_complex',
        "drawtext=textfile='/tmp/ayoitson.txt':fontcolor=white;[0:v]null[v]",
      ])
    ).not.toThrow();

    expect(() =>
      toSafeFfmpegArgs(['-headers', 'X-Plex-Token: redacted\r\n'])
    ).not.toThrow();

    expect(() => toSafeFfmpegArgs(['X-Plex-Token: redacted\r\n'])).toThrow(
      /newline/
    );
  });
});
