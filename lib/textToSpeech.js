const settings = require('../data/settings');

// Builds the same link as getAudioUrl from google-tts-api did.
// encodeURIComponent encodes spaces as %20, like the package, not as "+".
function buildSpeechUrl(text) {
  const query = {
    ie: 'UTF-8',
    q: text,
    tl: settings.language,
    total: 1,
    idx: 0,
    textlen: text.length,
    client: 'tw-ob',
    prev: 'input',
    ttsspeed: 1,
  };

  const queryString = Object.entries(query)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  return `${settings.ttsUrl}?${queryString}`;
}

// Downloads the spoken text as an MP3 file and returns it as a Buffer.
async function textToSpeech(text) {
  if (text.length > settings.maxTextLength) {
    throw new Error(
      `Texten är ${text.length} tecken, max är ${settings.maxTextLength}.`,
    );
  }

  const url = buildSpeechUrl(text);

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
