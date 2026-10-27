const { countHumans } = require('./countHumans');
const { createPlayer, playAudio } = require('./playAudio');
const { textToSpeech } = require('./textToSpeech');
const {
  connectTo,
  disconnect,
  getConnectedChannelId,
} = require('./voiceConnection');

const UNKNOWN_CHANNEL_NAME = 'röstkanalen';

// One queue per server. A bot can only be in one voice channel per server,
// so announcements are played one at a time, in order.
const queues = new Map();

function getQueue(guildId) {
  if (!queues.has(guildId)) {
    queues.set(guildId, { items: [], running: false, player: createPlayer() });
  }
  return queues.get(guildId);
}

function isQueueRunning(guildId) {
  const queue = queues.get(guildId);
  if (!queue) {
    return false;
  }
  return queue.running;
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

  // Create the audio first, so we do not join a channel only to stay silent.
  const audio = await textToSpeech(text);
  const connection = await connectTo(channel);
  connection.subscribe(player);

  console.log(`Läser upp i ${channel.name}: ${text}`);
  await playAudio(player, audio);
}

// Waits while announcements are queued, they decide where the bot goes next.
function leaveIfAlone(guild) {
  if (isQueueRunning(guild.id)) {
    return;
  }

  const channelId = getConnectedChannelId(guild.id);
  if (channelId === null) {
    return;
  }

  const channel = guild.channels.cache.get(channelId);
  if (channel && countHumans(channel) > 0) {
    return;
  }

  let channelName = UNKNOWN_CHANNEL_NAME;
  if (channel) {
    channelName = channel.name;
  }
  console.log(`Lämnar ${channelName}, ingen är kvar.`);
  disconnect(guild.id);
}

module.exports = { enqueueAnnouncement, leaveIfAlone };
