const googleTTS = require('google-tts-api');
const settings = require('../data/settings');

// Downloads the spoken text as an MP3 file and returns it as a Buffer.
async function textToSpeech(text) {
  if (text.length > settings.maxTextLength) {
    throw new Error(
      `Texten är ${text.length} tecken, max är ${settings.maxTextLength}.`,
    );
  }

  const url = googleTTS.getAudioUrl(text, { lang: settings.language });

  let response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(settings.timeouts.ttsMs),
    });
  } catch (error) {
    throw new Error(
      `Kunde inte hämta tal från Google (${error.name === 'TimeoutError' ? 'tog för lång tid' : error.message}).`,
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new Error(
      `Google text-till-tal svarade med fel ${response.status} ${response.statusText}.`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

module.exports = { textToSpeech };
