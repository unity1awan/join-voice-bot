const { KokoroTTS } = require('kokoro-js');
const settings = require('../data/settings');

let modelPromise = null;

async function loadModel() {
  const { modelId, dtype, device, voice } = settings.speech;
  const tts = await KokoroTTS.from_pretrained(modelId, { dtype, device });

  if (!Object.hasOwn(tts.voices, voice)) {
    throw new Error(
      `Rösten "${voice}" finns inte. Välj en av: ${Object.keys(tts.voices).join(', ')}.`,
    );
  }

  // The first generation is slower than the rest, so do it now
  // instead of during the first announcement.
  await tts.generate('Ready', { voice });
  return tts;
}

// Loads the model once and reuses it. Call it when the bot starts.
// If loading fails, the next call tries again.
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

// Rejects if the promise takes too long. The work itself cannot be
// cancelled, but the queue does not have to wait for it.
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('tog för lång tid')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Turns the text into speech and returns it as a WAV file in a Buffer.
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
