const settings = require('../data/settings');

const NAME_PLACEHOLDER = '{name}';

// Keeps letters, combining marks, digits, spaces and a few characters
// that are fine inside a name. Everything else (emojis, symbols) is removed.
const UNREADABLE_CHARACTERS = /[^\p{L}\p{M}\p{N}\s'.-]/gu;

function cleanName(rawName) {
  return (
    String(rawName ?? '')
      // Turns "fancy font" letters like 𝓙𝓸𝓱𝓷 or Ｊｏｈｎ into plain John.
      .normalize('NFKC')
      .replace(UNREADABLE_CHARACTERS, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

// Cuts by whole characters so emoji-like surrogate pairs are never split.
function truncate(text, maxLength) {
  let result = '';
  for (const character of text) {
    if (result.length + character.length > maxLength) {
      break;
    }
    result += character;
  }
  return result.trim();
}

function buildMessage(rawName) {
  const template = settings.messageTemplate;
  const maxNameLength =
    settings.maxTextLength - (template.length - NAME_PLACEHOLDER.length);

  const cleanedName = truncate(cleanName(rawName), maxNameLength);
  // A name like "..." has nothing to read, so it counts as empty too.
  const name = /[\p{L}\p{N}]/u.test(cleanedName)
    ? cleanedName
    : settings.fallbackName;
  const message = template.replace(NAME_PLACEHOLDER, name);

  // Last guard in case the template itself is too long.
  return truncate(message, settings.maxTextLength);
}

module.exports = { buildMessage, cleanName };
