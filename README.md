# JoinVoice

A Discord bot that announces who joins a voice channel – out loud.

> 🎩 _"Aone has joined."_

## Why

In my friend group's Discord server, people often join voice channels without saying anything, so nobody knows who just arrived. JoinVoice fixes that: when someone joins, the bot follows them into the channel and says their name with a British narrator voice.

## Features

- Announces `<name> has joined` when someone joins or switches voice channel
- Follows people between channels and leaves when nobody is left
- Queue: if several people join at once, they are announced one at a time
- Handles names with emojis and special characters (falls back to "Someone")
- Clear error messages – one failed announcement never stops the bot
- Text-to-speech runs **locally** with [Kokoro](https://www.npmjs.com/package/kokoro-js) (free, no API key)

## Tech stack

- **Node.js** + **discord.js** (bot and events)
- **@discordjs/voice** (voice connections, with DAVE end-to-end encryption)
- **kokoro-js** (local text-to-speech, voice `bm_fable`)
- **FFmpeg** via `ffmpeg-static` (audio conversion)
- **ESLint** + **Prettier** (linting and formatting)

## How it works

```
Someone joins a voice channel
        │
        ▼
Discord sends a VoiceStateUpdate event
        │
        ▼
index.js checks: a real person? a new channel?
        │
        ▼
lib/buildMessage.js  →  "Aone has joined"
        │
        ▼
lib/textToSpeech.js  →  audio (WAV) with Kokoro
        │
        ▼
lib/voicePlayer.js   →  queue → join channel → play → leave when empty
```

## Project structure

```
data/settings.js        Settings: voice, message template, limits, timeouts
lib/buildMessage.js     Builds a speakable message from a member's name
lib/textToSpeech.js     Loads the voice model and turns text into audio
lib/voicePlayer.js      Queues announcements and plays them one at a time
lib/voiceConnection.js  Joins, moves between and leaves voice channels
lib/playAudio.js        Plays audio in a voice channel
lib/countHumans.js      Counts non-bot members in a channel
scripts/voiceSamples.js Generates samples of every available voice
index.js                Connects everything
```

## Setup

**Requirements:** Node.js 22.12 or newer.

1. Create a bot in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Invite it with the scope `bot` and the permissions **View Channels**, **Connect** and **Speak**.
3. Install and configure:

```bash
npm ci
cp .env.example .env   # then add your DISCORD_TOKEN
npm start
```

The first start downloads the voice model (about 89 MB).

### Scripts

| Command           | What it does                                        |
| ----------------- | --------------------------------------------------- |
| `npm start`       | Starts the bot                                      |
| `npm run lint`    | Checks the code with ESLint                         |
| `npm run format`  | Formats the code with Prettier                      |
| `npm run samples` | Creates a sample file for every voice in `samples/` |

## Design decisions

- **Least privilege:** the bot only asks for the `Guilds` and `GuildVoiceStates` intents and three permissions.
- **Removed a dependency with known vulnerabilities:** the first version used `google-tts-api`, which pulled in a vulnerable version of `axios`. I only needed one small function, so I replaced the package with a few lines of my own code.
- **Accepted risk:** `npm audit` reports vulnerabilities in `sharp` (image processing), which Kokoro depends on. No compatible fix exists yet. The bot never processes images – only short text – so the vulnerable code paths cannot be reached. I chose not to force an untested major version.
- **Local text-to-speech:** Kokoro runs on the bot's own machine instead of relying on an unofficial online service.

## What I learned

- **Building a Discord bot from scratch** – from creating the application in the
  Developer Portal to having it running in a real Discord server.
- **JavaScript is the most common choice for Discord bots.** I compared languages
  and libraries before starting and chose discord.js because it has the largest
  community and the best voice support.
- **Events:** how Discord tells the bot what happens, and how to compare
  `oldState` and `newState` to know when someone actually joined.
- **Some parts are harder than others.** Logging in and listening to events was
  straightforward. Voice connections, audio and encryption were much harder to
  understand, so I took them one step at a time.
- **Security in practice:** keeping the token in `.env`, giving the bot only the
  permissions it needs, and evaluating `npm audit` results instead of just
  running fixes.
- **Working like a developer:** small commits, testing before committing,
  branches for bigger changes and linting before every commit.
