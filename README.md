# Bubble Pop Safari 🦁🫧

A mobile web game for kids aged 4 to 8. Colorful animal bubbles float up the screen; the friendly guide asks for "the RED bubbles" or "3 lions"; tap the right ones to fill the bar, get a confetti party, and earn a sticker. No lives, no timers, no game over, no ads, no network, nothing to read.

Ten rounds, ten stickers, progress saved on the phone. Works offline and can be added to the home screen on iOS and Android.

## Play it on your phone right away

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
| `sw.js` | Service worker so the game works offline after the first load. |
| `manifest.webmanifest`, `icon-192.png`, `icon-512.png` | Add‑to‑home‑screen support. |
| `serve.sh` | One‑command local server + ngrok tunnel + QR code. |
| `test/smoke.js` | Playwright playthrough test used during development. |
| `screenshots/` | Home screen and a round in progress. |
| `PROMPT.md` | The prompt this game was built from. |

## Rounds

| Rounds | Ask | Example |
| --- | --- | --- |
| 1 to 7 | One color or one animal | "Pop three RED bubbles!", "Pop three lions!" |
| 8 to 10 | Color and animal together | "Pop four BLUE elephants!" |

Bubbles get a little more numerous and a little faster each round. Wrong taps only wiggle and giggle. After the tenth sticker the Play button turns into free play.

Nothing needs to be read: the owl shows a pointing hand and the bubble to pop, says it out loud, and the star bar shows how many are left. An accidental tap on the Home button keeps the round's progress.

## Development

```bash
python3 -m http.server 8080
NODE_PATH=/path/to/node_modules node test/smoke.js http://127.0.0.1:8080 /tmp/out "Pixel 5"
```

`test/smoke.js` needs Playwright. It plays two rounds, checks wrong taps are harmless, reloads to check the stickers and mute setting persisted, and fails on any page error or external request.
