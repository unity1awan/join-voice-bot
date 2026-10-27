// Counts members in a voice channel that are not bots.
// Members missing from the cache are counted as humans, so the bot
// rather stays a bit too long than leaves someone who is still there.
function countHumans(channel) {
  const voiceStates = channel.guild.voiceStates.cache;
  return voiceStates.filter(
    (state) => state.channelId === channel.id && !state.member?.user.bot,
  ).size;
}

module.exports = { countHumans };
