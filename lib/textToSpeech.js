const { KokoroTTS } = require('kokoro-js');
const settings = require('../data/settings');

const WARM_UP_TEXT = 'Ready';

let modelPromise = null;

async function loadModel() {
  const { modelId, dtype, device, voice } = settings.speech;
  const tts = await KokoroTTS.from_pretrained(modelId, { dtype, device });

  if (!Object.hasOwn(tts.voices, voice)) {
    const voiceNames = Object.keys(tts.voices).join(', ');
    throw new Error(`Rösten "${voice}" finns inte. Välj en av: ${voiceNames}.`);
  }

  // The first generation is slower than the rest, so do it now
  // instead of during the first announcement.
  await tts.generate(WARM_UP_TEXT, { voice });
  return tts;
}

// The promise is shared so the model is only loaded once. It is cleared
// on failure so the next announcement tries to load it again.
function loadSpeechModel() {
  if (!modelPromise) {
    modelPromise = loadModel().catch((error) => {
      modelPromise = null;
      throw new Error(`Kunde inte ladda talmodellen: ${error.message}`, {
        cause: error,
      });
    });
  }
  return modelPromise;
}

// The work itself cannot be cancelled, but the queue does not have to wait for it.
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('tog för lång tid')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function textToSpeech(text) {
  if (text.length > settings.maxTextLength) {
    throw new Error(
      `Texten är ${text.length} tecken, max är ${settings.maxTextLength}.`,
    );
  }

  const tts = await loadSpeechModel();

  let audio;
  try {
    audio = await withTimeout(
      tts.generate(text, { voice: settings.speech.voice }),
      settings.timeouts.ttsMs,
    );
  } catch (error) {
    throw new Error(`Kunde inte skapa tal (${error.message}).`, {
      cause: error,
    });
  }

  return Buffer.from(audio.toWav());
}

module.exports = { loadSpeechModel, textToSpeech };
