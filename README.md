# Bubble Pop Safari 🦁🫧

A mobile web game for kids aged 4 to 8. Colorful animal bubbles float up the screen; the friendly owl's bubble says "Pop 3 RED bubbles!" or "Pop 3 LIONS!" in big simple words, with the color word shown in its color and a picture of the bubble to pop; tap the right ones to fill the bar, get a confetti party, and earn a sticker. No voice, no ads, no network. A cheerful looping tune plays along, generated in the browser.

Ten rounds, ten stickers, progress saved on the phone. Works offline and can be added to the home screen on iOS and Android.

Three games, picked with the three buttons under the title:

| | Mode | What it is |
| --- | --- | --- |
| 🦁 | Animals | Pop the bubbles the owl asks for: a color, an animal, or both. |
| 🔢 | Math | Every bubble carries a number. The owl shows a question ("3 + 2 = ?", "Find 4" with dots to count, "5 + ? = 9", "3 × 4 = ?") and the child pops the bubble with the right answer. In easy, sums are drawn as dots to count: three blue dots and two orange ones for "3 + 2", seven dots with the last three faded for "7 − 3", so a child who cannot read digits yet can count instead of guess. Five right answers earn the sticker. Rounds go from finding numbers, to adding, subtracting, missing numbers, times tables, and a mix. Numbers go up to 20 in easy, 50 in hard, 100 in expert. |
| 💬 | Words | A little Duolingo. Pick a language (French, Spanish, Italian or German) and the owl shows a word in it, "GRENOUILLE". The bubbles carry the animals and colors, with nothing written on them, and the child pops the one the word means. Five right answers earn the sticker. Rounds 1 to 7 go from four animals, to colors, to everything mixed; rounds 8 to 10 turn it around: the owl shows the picture and the English word and the bubbles only carry the foreign words. |

Each mode keeps its own sticker book and stars.

**The learning rule.** The game never shows the answer while the child is still trying: no hints, no translations, no name tags on the bubbles. The answer appears only after a failure, so a mistake becomes a lesson: when the three hearts run out (or, in free play, after three wrong tries on one question), the owl's bubble shows the full answer (the word with its picture and English meaning, the equation with its result, or the animals goal with its bubble), the right bubbles glow for a couple of seconds, and then play goes on. This applies to every mode.

Three difficulties, picked with the three buttons under Play:

| | Mode | What changes |
| --- | --- | --- |
| 🐣 | Easy | The gentle original, with three lives: a wrong tap wiggles the bubble and costs a heart; the third miss shows the answer and ends the level. No timers, no bombs, no stars recorded. |
| 🔥 | Hard | Faster, smaller and more bubbles. A wrong tap or a bomb costs a heart. Bomb bubbles to avoid. From round 5 the owl asks for two things in turn (a green bubble, then a pink one). |
| ⚡ | Expert | Faster still. A timer bar that refills a little with every good pop; when it runs out you lose a heart. Some bubbles change colour every second, so they become the target only for a moment. Ordered goals from round 3, three-step goals from round 7. |

Every level, in every difficulty, is played with three lives: miss three times and you are dead. The owl shows the answer once, then it is back to the home screen ("Try again!") and Play starts the level again from zero. Stickers already earned are never taken away, and nothing about hearts is kept. Every round in hard and expert earns one to three stars (no mistakes = three), shown on the sticker book, and each difficulty keeps its own progress while the stickers are shared.

All the art is custom, generated with Higgsfield and cut out into small webp files in `art/`: the ten animals, the owl guide, the bomb, and every interface icon (play arrow, house, speaker, stars, hearts, pointing hand, trophy, chick, flame, lightning; the speech-bubble icon of the words game is drawn with a small script). No emoji are used except as a fallback while an image is still loading.

## Play it online

The game is hosted on GitHub Pages: **<https://flahz.github.io/claude-game-vibe/>**

GitHub Pages serves the `main` branch directly (Settings → Pages → Source: Deploy from a branch, `main`, `/ (root)`), so every push to `main` republishes the game within a minute; GitHub's own "pages build and deployment" workflow does the work. The `.nojekyll` file tells it to copy the files as they are. Open the URL on a phone and use "Add to Home Screen" to install it.

## Play it on your phone right away with ngrok

```bash
git clone https://github.com/Flahz/claude-game-vibe.git
cd claude-game-vibe
./serve.sh
```

`serve.sh` starts a local server on port 8080, opens an ngrok tunnel, prints the public `https://….ngrok-free.app` URL and a QR code to scan. Press Ctrl+C to stop both.

The first time, ngrok needs a free auth token:

1. Install ngrok: `brew install ngrok` (macOS), `choco install ngrok` (Windows), or see <https://ngrok.com/download>.
2. Copy your token from <https://dashboard.ngrok.com/get-started/your-authtoken> and run once:
   ```bash
   ngrok config add-authtoken <YOUR_TOKEN>
   ```
3. Run `./serve.sh` again.

On the first visit ngrok's free plan shows a "Visit Site" button; tap it once. If you skip ngrok, the script still prints a same‑Wi‑Fi URL you can open on the phone.

Manual equivalent of the script:

```bash
python3 -m http.server 8080      # terminal 1
ngrok http 8080                  # terminal 2, copy the https URL
```

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole game. All HTML, CSS and JavaScript inline. No build step, no dependencies. |
| `art/*.webp` | The custom art, 208px each: 10 animals, the owl guide, the bomb, and 13 interface icons. Emoji are only used as a fallback while they load. |
| `sw.js` | Service worker so the game works offline after the first load. |
| `manifest.webmanifest`, `icon-192.png`, `icon-512.png` | Add‑to‑home‑screen support. |
| `.nojekyll` | Tells GitHub Pages to publish the files as they are. |
| `serve.sh` | One‑command local server + ngrok tunnel + QR code. |
| `test/smoke.js` | Playwright playthrough test (easy mode) used during development. |
| `test/lives.js` | Playwright test for the three lives in easy, all modes: every wrong tap costs a heart, a right pop does not give one back, the third miss reveals the answer exactly once and ends the level (home screen, nothing recorded, Play restarts it from zero), nothing given away during play. |
| `test/hard.js` | Playwright test for hard and expert mode: hearts, bombs, the failed level, stars, ordered goals, timer, colour shifts. |
| `test/math.js` | Playwright test for math mode: every round kind, answers checked, the dots drawn for easy sums (and none for missing numbers, times tables, sums over 10 or hard), nothing given away during play, the reveal after three misses, separate progress, hard mode with hearts and bombs. |
| `test/words.js` | Playwright test for words mode: language picker, picture and color rounds, reverse rounds, no answer on screen while playing, the reveal after three wrong tries and after a lost round, separate progress, expert. |
| `CLAUDE.md` | The purpose of the app and the rules every change must follow (the learning rule above, art, tests, deployment). |
| `screenshots/` | Home screen, rounds in each mode, a celebration. |
| `decisions/` | One record per feature debate: the proposals, the vote, the winner and why, the rejected ideas. |
| `PROMPT.md` | The prompt this game was built from. |

## Rounds

| Rounds | Ask | Example |
| --- | --- | --- |
| 1 to 7 | One color or one animal | "Pop three RED bubbles!", "Pop three lions!" |
| 8 to 10 | Color and animal together | "Pop four BLUE elephants!" |

Bubbles get a little more numerous and a little faster each round. In hard and expert, later rounds ask for an ordered sequence instead, and the goal pill shows the steps with the current one highlighted. After the tenth sticker of a difficulty the Play button turns into free play for it.

Everything is on screen in short words a young reader can manage: the owl's bubble shows the instruction and the bubble to pop, big words like "Round 3", "Oops!", "Faster!" and "Try again!" pop up in the middle, the count floats up from each popped bubble, and the star bar shows how many are left. There is no voice. An accidental tap on the Home button keeps the round's progress.

The music is generated with Web Audio (a pentatonic tune over C, G, Am, F with bass, kick and hi-hat during play, a softer version on the home screen, a little faster in hard and expert), so there are no audio files to download. The sound button mutes music and effects together.

## Development

```bash
python3 -m http.server 8080
NODE_PATH=/path/to/node_modules node test/smoke.js http://127.0.0.1:8080 /tmp/out "Pixel 5"
```

`test/smoke.js` needs Playwright. It plays two rounds, checks a wrong tap costs a heart but no progress, reloads to check the stickers and mute setting persisted, and fails on any page error or external request. `test/hard.js` (same arguments minus the device) switches to hard, loses hearts to a wrong tap and a bomb, checks the failed level goes home and Play restarts it, finishes round 1 with two stars, plays an ordered round, then plays expert round 7 with the timer and colour-shifting bubbles, and measures the frame rate on expert round 10. `test/lives.js` plays easy in all three modes and checks the hearts: a heart per miss, the reveal on the third, the failed level.

The test hook `window.__bps` exposes `state()`, `startGame()`, `startRound(n)`, `setDifficulty('easy'|'hard'|'expert')`, `setMode('safari'|'math'|'words')`, `setLanguage('fr'|'es'|'it'|'de')` and `resetProgress()`.
