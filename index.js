const { Client, Events, GatewayIntentBits } = require('discord.js');

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

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  const isInChannelNow = newState.channelId !== null;
  const hasChangedChannel = newState.channelId !== oldState.channelId;

  if (!isInChannelNow || !hasChangedChannel) {
    return;
  }

  const memberName = newState.member.displayName;
  const channelName = newState.channel.name;
  console.log(`${memberName} gick in i ${channelName}`);
});

client.login(token).catch((error) => {
  console.error('Kunde inte logga in. Kontrollera DISCORD_TOKEN i .env.');
  console.error(error.message);
  process.exit(1);
});
