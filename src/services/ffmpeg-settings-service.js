const databaseMigration = require('../database-migration');
const DAY_MS = 1000 * 60 * 60 * 24;
const { validateFFmpegPath } = require('../lib/ffmpeg-path-validator');

class FfmpegSettingsService {
  constructor(db, unlock) {
    this.db = db;
    if (unlock) {
      this.unlock();
    }
  }

  get() {
    let ffmpeg = this.getCurrentState();
    if (isLocked(ffmpeg)) {
      ffmpeg.lock = true;
    }
    // Hid this info from the API
    delete ffmpeg.ffmpegPathLockDate;
    return ffmpeg;
  }

  unlock() {
    let ffmpeg = this.getCurrentState();
    console.log('ffmpeg path UI unlocked for another day...');
    ffmpeg.ffmpegPathLockDate = new Date().getTime() + DAY_MS;
    this.db['ffmpeg-settings'].update({ _id: ffmpeg._id }, ffmpeg);
  }

  update(attempt) {
    let ffmpeg = this.getCurrentState();
    attempt.ffmpegPathLockDate = ffmpeg.ffmpegPathLockDate;
    if (isLocked(ffmpeg)) {
      console.log(
        "Note: ffmpeg path is not being updated since it's been locked for your security."
      );
      attempt.ffmpegPath = ffmpeg.ffmpegPath;
      if (typeof ffmpeg.ffmpegPathLockDate === 'undefined') {
        // make sure to lock it even if it was undefined
        attempt.ffmpegPathLockDate = new Date().getTime() - DAY_MS;
      }
    } else if (attempt.addLock === true) {
      // lock it right now
      attempt.ffmpegPathLockDate = new Date().getTime() - DAY_MS;
    } else {
      attempt.ffmpegPathLockDate = new Date().getTime() + DAY_MS;
    }
    delete attempt.addLock;
    delete attempt.lock;

    let err = fixupFFMPEGSettings(attempt);
    if (typeof err !== 'undefined') {
      return {
        error: err,
      };
    }

    this.db['ffmpeg-settings'].update({ _id: ffmpeg._id }, attempt);
    return {
      ffmpeg: this.get(),
    };
  }

  reset() {
    // Even if reseting, it's impossible to unlock the ffmpeg path
    let ffmpeg = databaseMigration.defaultFFMPEG();
    this.update(ffmpeg);
    return this.get();
  }

  getCurrentState() {
    return this.db['ffmpeg-settings'].find()[0];
  }
}

function fixupFFMPEGSettings(ffmpeg) {
  const pathResult = validateFFmpegPath(ffmpeg.ffmpegPath);
  if (!pathResult.ok) {
    return pathResult.error;
  }

  if (typeof ffmpeg.maxFPS === 'undefined') {
    ffmpeg.maxFPS = 60;
    return null;
  } else if (isNaN(ffmpeg.maxFPS)) {
    return 'maxFPS should be a number';
  }
}

function isLocked(ffmpeg) {
  return (
    isNaN(ffmpeg.ffmpegPathLockDate) ||
    ffmpeg.ffmpegPathLockDate < new Date().getTime()
  );
}

module.exports = FfmpegSettingsService;
