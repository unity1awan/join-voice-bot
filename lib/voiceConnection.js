const {
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
} = require('@discordjs/voice');
const settings = require('../data/settings');

// Moving an existing connection does not reliably wait for the new
// channel to be ready, so only a connection that is already in the right
// channel, and not lost, is reused.
function canReuse(connection, channel) {
  if (connection.joinConfig.channelId !== channel.id) {
    return false;
  }
  return connection.state.status !== VoiceConnectionStatus.Disconnected;
}

// Happens if the bot is kicked from the channel or the network drops.
// Give it a few seconds to reconnect, otherwise clean up.
async function waitForReconnect(connection) {
  const { reconnectMs } = settings.timeouts;
  try {
    await Promise.race([
      entersState(connection, VoiceConnectionStatus.Signalling, reconnectMs),
      entersState(connection, VoiceConnectionStatus.Connecting, reconnectMs),
    ]);
  } catch {
    if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
      console.log('Röstanslutningen bröts och kom inte tillbaka.');
      connection.destroy();
    }
  }
}

function joinChannel(channel) {
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  // Without a listener, an 'error' event would crash the bot.
  connection.on('error', (error) => {
    console.error(`Fel i röstanslutningen: ${error.message}`);
  });
  connection.on(VoiceConnectionStatus.Disconnected, () =>
    waitForReconnect(connection),
  );

  return connection;
}

async function connectTo(channel) {
  let connection = getVoiceConnection(channel.guild.id);

  if (connection && !canReuse(connection, channel)) {
    connection.destroy();
    connection = undefined;
  }
  if (!connection) {
    connection = joinChannel(channel);
  }

  const { connectMs } = settings.timeouts;
  try {
    await entersState(connection, VoiceConnectionStatus.Ready, connectMs);
  } catch (error) {
    if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
      connection.destroy();
    }
    throw new Error(
      `Kunde inte ansluta till ${channel.name} inom ${connectMs / 1000} sekunder.`,
      { cause: error },
    );
  }

  return connection;
}

function getConnectedChannelId(guildId) {
  const connection = getVoiceConnection(guildId);
  if (!connection) {
    return null;
  }
  return connection.joinConfig.channelId;
}

function disconnect(guildId) {
  const connection = getVoiceConnection(guildId);
  if (connection) {
    connection.destroy();
  }
}

module.exports = { connectTo, disconnect, getConnectedChannelId };
