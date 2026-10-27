const { Client, Events, GatewayIntentBits } = require('discord.js');
const { buildMessage } = require('./lib/buildMessage');
const { loadSpeechModel } = require('./lib/textToSpeech');
const { enqueueAnnouncement, leaveIfAlone } = require('./lib/voicePlayer');

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('DISCORD_TOKEN saknas. Lägg till den i .env.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Inloggad som ${readyClient.user.tag}`);
});

// Without a listener, an 'error' event would crash the bot.
client.on(Events.Error, (error) => {
  console.error(`Discord-fel: ${error.message}`);
});

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  try {
    handleVoiceStateUpdate(oldState, newState);
  } catch (error) {
    console.error(`Fel vid hantering av röstkanalshändelse: ${error.message}`);
  }
});

function handleVoiceStateUpdate(oldState, newState) {
  announceJoin(oldState, newState);
  // Any update can be someone leaving the bot's channel.
  leaveIfAlone(newState.guild);
}

function announceJoin(oldState, newState) {
  const isInChannelNow = newState.channelId !== null;
  const hasChangedChannel = newState.channelId !== oldState.channelId;

  if (!isInChannelNow || !hasChangedChannel) {
    return;
  }

  const member = newState.member;
  if (!member || member.user.bot) {
    return;
  }

  const memberName = member.displayName;
  const channelName = newState.channel.name;
  console.log(`${memberName} gick in i ${channelName}`);

  enqueueAnnouncement(newState.channel, buildMessage(memberName));
}

async function preloadSpeechModel() {
  console.log('Laddar talmodellen...');
  try {
    await loadSpeechModel();
    console.log('Talmodellen är laddad.');
  } catch (error) {
    console.error(`${error.message} Försöker igen vid nästa uppläsning.`);
  }
}

// Loaded while logging in, so the first announcement is fast.
preloadSpeechModel();

client.login(token).catch((error) => {
  console.error('Kunde inte logga in. Kontrollera DISCORD_TOKEN i .env.');
  console.error(error.message);
  process.exit(1);
});
