// Members missing from the cache are counted as humans, so the bot
// rather stays a bit too long than leaves someone who is still there.
function isHuman(voiceState) {
  if (!voiceState.member) {
    return true;
  }
  return !voiceState.member.user.bot;
}

function countHumans(channel) {
  const voiceStates = channel.guild.voiceStates.cache;
  const humansInChannel = voiceStates.filter(
    (state) => state.channelId === channel.id && isHuman(state),
  );
  return humansInChannel.size;
}

module.exports = { countHumans };
