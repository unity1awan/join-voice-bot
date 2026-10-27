module.exports = {
  speech: {
    modelId: 'onnx-community/Kokoro-82M-v1.0-ONNX',
    // British English, male. Run "npm run samples" to hear all voices.
    voice: 'bm_fable',
    // q8 is about 90 MB. fp32 sounds slightly better but is about 3-4 times larger.
    dtype: 'q8',
    device: 'cpu',
  },

  // {name} is replaced with the member's cleaned display name.
  messageTemplate: '{name} has joined',
  fallbackName: 'Someone',

  // Discord display names are at most 32 characters, so a message is never
  // longer than about 45. The limit keeps speech generation fast and well
  // below the point where Kokoro silently cuts off long text.
  maxTextLength: 100,

  timeouts: {
    ttsMs: 10_000,
    connectMs: 15_000,
    // How long a lost connection may try to recover before it is closed.
    reconnectMs: 5_000,
    playbackMs: 20_000,
  },
};
