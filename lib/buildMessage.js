const settings = require('../data/settings');

const NAME_PLACEHOLDER = '{name}';

// Emojis and symbols cannot be spoken, so only letters, combining marks,
// digits, spaces and a few characters that are common in names are kept.
const UNREADABLE_CHARACTERS = /[^\p{L}\p{M}\p{N}\s'.-]/gu;
const READABLE_CHARACTER = /[\p{L}\p{N}]/u;

function cleanName(rawName) {
  if (rawName === null || rawName === undefined) {
    return '';
  }

  // NFKC turns "fancy font" letters like 𝓙𝓸𝓱𝓷 or Ｊｏｈｎ into plain John.
  const normalized = String(rawName).normalize('NFKC');
  const readable = normalized.replace(UNREADABLE_CHARACTERS, ' ');
  const singleSpaced = readable.replace(/\s+/g, ' ');
  return singleSpaced.trim();
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
  const templateLength = template.length - NAME_PLACEHOLDER.length;
  const maxNameLength = settings.maxTextLength - templateLength;

  let name = truncate(cleanName(rawName), maxNameLength);
  // A name like "..." has nothing to read, so it counts as empty too.
  if (!READABLE_CHARACTER.test(name)) {
    name = settings.fallbackName;
  }

  const message = template.replace(NAME_PLACEHOLDER, name);
  // Guards against a template that is too long on its own.
  return truncate(message, settings.maxTextLength);
}

module.exports = { buildMessage };
