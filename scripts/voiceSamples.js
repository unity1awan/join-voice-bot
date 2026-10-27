const fs = require('node:fs');
const path = require('node:path');
// kokoro-js is ESM but also ships a CommonJS build, which require() picks.
const { KokoroTTS } = require('kokoro-js');
const settings = require('../data/settings');

const TEXT = 'Aone has joined';
const OUTPUT_DIR = path.join(__dirname, '..', 'samples');

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('Laddar modellen (första gången laddas den ner)...');
  const { modelId, dtype, device } = settings.speech;
  const tts = await KokoroTTS.from_pretrained(modelId, { dtype, device });

  const voices = Object.keys(tts.voices);
  console.log(`Gör ${voices.length} röstprov med texten "${TEXT}".`);

  for (const voice of voices) {
    const { name, language, gender } = tts.voices[voice];
    try {
      const audio = await tts.generate(TEXT, { voice });
      const file = path.join(OUTPUT_DIR, `${voice}.wav`);
      audio.save(file);
      console.log(`  ${voice} (${name}, ${language}, ${gender}) -> ${file}`);
    } catch (error) {
      console.error(`  ${voice}: misslyckades: ${error.message}`);
    }
  }

  console.log('Klart.');
}

main().catch((error) => {
  console.error(`Kunde inte göra röstprov: ${error.message}`);
  process.exit(1);
});
