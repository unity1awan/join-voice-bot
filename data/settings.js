module.exports = {
  // Language code for Google text-to-speech.
  language: 'en',

  // Google text-to-speech endpoint.
  ttsUrl: 'https://translate.google.com/translate_tts',

  // {name} is replaced with the member's (cleaned) display name.
  messageTemplate: '{name} has joined',

  // Used when nothing readable is left of the name.
  fallbackName: 'Someone',

  // Google text-to-speech accepts at most 200 characters per request.
  maxTextLength: 200,

  timeouts: {
    // Fetching the audio file from Google.
    ttsMs: 10_000,
    // Connecting to a voice channel.
    connectMs: 15_000,
    // Waiting for a lost connection to recover before giving up.
    reconnectMs: 5_000,
    // Playing one announcement.
    playbackMs: 20_000,
  },
};
