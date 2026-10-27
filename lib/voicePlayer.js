const { Readable } = require('node:stream');
const {
  AudioPlayerStatus,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
} = require('@discordjs/voice');
const settings = require('../data/settings');
const { countHumans } = require('./countHumans');
const { textToSpeech } = require('./textToSpeech');

// One queue per server. A bot can only be in one voice channel per server,
// so announcements are played one at a time, in order.
const queues = new Map();

function getQueue(guildId) {
  if (!queues.has(guildId)) {
    const player = createAudioPlayer();
    player.on('error', (error) => {
      console.error(`Fel vid uppspelning: ${error.message}`);
    });
    queues.set(guildId, { items: [], running: false, player });
  }
  return queues.get(guildId);
}

function enqueueAnnouncement(channel, text) {
  const queue = getQueue(channel.guild.id);
  queue.items.push({ channelId: channel.id, text });

  if (!queue.running) {
    processQueue(channel.guild, queue).catch((error) => {
      console.error(`Oväntat fel i uppläsningskön: ${error.message}`);
      queue.running = false;
    });
  }
}

async function processQueue(guild, queue) {
  queue.running = true;

  while (queue.items.length > 0) {
    const item = queue.items.shift();
    try {
      await announce(guild, queue.player, item);
    } catch (error) {
      console.error(`Kunde inte läsa upp "${item.text}": ${error.message}`);
    }
  }

  queue.running = false;
  leaveIfAlone(guild);
}

async function announce(guild, player, { channelId, text }) {
  const channel = guild.channels.cache.get(channelId);
  if (!channel) {
    console.log(`Hoppar över "${text}": kanalen finns inte längre.`);
    return;
  }

  // The person may have left again while waiting in the queue.
  if (countHumans(channel) === 0) {
    console.log(`Hoppar över "${text}": ingen är kvar i ${channel.name}.`);
    return;
  }

  if (!channel.joinable) {
    throw new Error(
      `Kan inte gå in i ${channel.name}. Saknar behörigheten Se kanal/Anslut, eller så är kanalen full.`,
    );
  }
  if (!channel.speakable) {
    throw new Error(`Saknar behörigheten Tala i ${channel.name}.`);
  }

  // Fetch the audio first, so we do not join a channel only to stay silent.
  const audio = await textToSpeech(text);
  const connection = await connectTo(channel);
  connection.subscribe(player);

  console.log(`Läser upp i ${channel.name}: ${text}`);
  await playAudio(player, audio);
}

async function connectTo(channel) {
  let connection = getVoiceConnection(channel.guild.id);

  // Moving an existing connection does not reliably wait for the new
  // channel to be ready, so a fresh connection is used instead.
  // The same goes for a connection that has been lost.
  if (
    connection &&
    (connection.joinConfig.channelId !== channel.id ||
      connection.state.status === VoiceConnectionStatus.Disconnected)
  ) {
    connection.destroy();
    connection = undefined;
  }

  if (!connection) {
    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    handleConnectionEvents(connection);
  }

  try {
    await entersState(
      connection,
      VoiceConnectionStatus.Ready,
      settings.timeouts.connectMs,
    );
  } catch (error) {
    if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
      connection.destroy();
    }
    throw new Error(
      `Kunde inte ansluta till ${channel.name} inom ${settings.timeouts.connectMs / 1000} sekunder.`,
      { cause: error },
    );
  }

  return connection;
}

function handleConnectionEvents(connection) {
  connection.on('error', (error) => {
    console.error(`Fel i röstanslutningen: ${error.message}`);
  });

  // Happens if the bot is kicked from the channel or the network drops.
  // Give it a few seconds to reconnect, otherwise clean up.
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(
          connection,
          VoiceConnectionStatus.Signalling,
          settings.timeouts.reconnectMs,
        ),
        entersState(
          connection,
          VoiceConnectionStatus.Connecting,
          settings.timeouts.reconnectMs,
        ),
      ]);
    } catch {
      if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
        console.log('Röstanslutningen bröts och kom inte tillbaka.');
        connection.destroy();
      }
    }
  });
}

async function playAudio(player, audio) {
  player.play(createAudioResource(Readable.from(audio)));

  // If playback fails, the player logs the error and goes back to Idle,
  // so waiting for Idle covers both success and failure.
  try {
    await entersState(
      player,
      AudioPlayerStatus.Idle,
      settings.timeouts.playbackMs,
    );
  } catch (error) {
    player.stop(true);
    throw new Error(
      `Uppspelningen tog längre än ${settings.timeouts.playbackMs / 1000} sekunder och avbröts.`,
      { cause: error },
    );
  }
}

// Leaves the bot's channel when no humans are left in it.
// Waits while announcements are queued, they decide where the bot goes next.
function leaveIfAlone(guild) {
  if (queues.get(guild.id)?.running) {
    return;
  }

  const connection = getVoiceConnection(guild.id);
  if (!connection) {
    return;
  }

  const channel = guild.channels.cache.get(connection.joinConfig.channelId);
  if (channel && countHumans(channel) > 0) {
    return;
  }

  console.log(`Lämnar ${channel?.name ?? 'röstkanalen'}, ingen är kvar.`);
  connection.destroy();
}

module.exports = { enqueueAnnouncement, leaveIfAlone };
