const { Client, Events, GatewayIntentBits } = require('discord.js');

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('DISCORD_TOKEN saknas. Lägg till den i .env.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Inloggad som ${readyClient.user.tag}`);
});

client.login(token).catch((error) => {
  console.error('Kunde inte logga in. Kontrollera DISCORD_TOKEN i .env.');
  console.error(error.message);
  process.exit(1);
});
