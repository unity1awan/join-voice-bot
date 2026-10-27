const { Readable } = require('node:stream');
const {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
} = require('@discordjs/voice');
const settings = require('../data/settings');

function createPlayer() {
  const player = createAudioPlayer();
  // Without a listener, an 'error' event would crash the bot.
  player.on('error', (error) => {
    console.error(`Fel vid uppspelning: ${error.message}`);
  });
  return player;
}

async function playAudio(player, audio) {
  player.play(createAudioResource(Readable.from(audio)));

  // If playback fails, the player logs the error and goes back to Idle,
  // so waiting for Idle covers both success and failure.
  const { playbackMs } = settings.timeouts;
  try {
    await entersState(player, AudioPlayerStatus.Idle, playbackMs);
  } catch (error) {
    player.stop(true);
    throw new Error(
      `Uppspelningen tog längre än ${playbackMs / 1000} sekunder och avbröts.`,
      { cause: error },
    );
  }
}

module.exports = { createPlayer, playAudio };
