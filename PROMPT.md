# Prompt: Build a kids' mobile game and host it on ngrok

Copy everything below the line and paste it into Claude Code.

---

Build me a mobile web game for kids aged 4 to 8 called **Bubble Pop Safari**, then host it on ngrok so I can open it on my phone right away.

## Game design

- **Core loop:** colorful animal bubbles float up from the bottom of the screen. Tap a bubble to pop it. Each pop plays a cheerful sound and shows a happy animal with a big star burst.
- **Goal per round:** a friendly guide at the top says "Pop the RED bubbles!" or "Pop 3 lions!" Popping the right ones fills a progress bar. Filling it triggers a confetti celebration and unlocks the next round.
- **Wrong taps never punish:** a wrong bubble just wiggles and giggles. No lives, no game over, no timers. Kids should never feel like they lost.
- **10 rounds** that gently increase difficulty: more bubbles, faster floating, then rounds that mix color and animal ("Pop the BLUE elephant").
- **Sticker book:** each round completed unlocks an animal sticker. Show the sticker book on the home screen with a big "Play" button.
- **Progress is saved** in localStorage so the sticker book survives a refresh.

## Kid-friendly requirements

- Huge tap targets, at least 80px. Everything works with one finger.
- No text a 4-year-old must read. Every instruction is also shown as an icon and spoken with the Web Speech API (with a mute button).
- Bright, high-contrast colors. Rounded shapes. Bouncy animations.
- No ads, no links out, no login, no external requests, no data collection.
- Simple sounds generated with the Web Audio API so there are no audio files to load.

## Technical requirements

- **One single file:** `index.html` with all HTML, CSS, and JavaScript inline. No frameworks, no build step, no npm.
- Works offline once loaded. Add a minimal PWA manifest and service worker inline or as tiny extra files so it can be "Add to Home Screen" on iOS and Android.
- Portrait-first layout that fills the screen on any phone. Handle `viewport-fit=cover` and safe areas. Prevent pinch zoom and double-tap zoom.
- Use `pointerdown` events for instant taps. Use `requestAnimationFrame` for the game loop. Must stay at 60fps on a cheap Android phone.
- Emoji are fine for the animals so no image assets are needed.

## Hosting on ngrok

After the game works:

1. Start a static server on port 8080 from the project folder, for example `python3 -m http.server 8080`.
2. Run `ngrok http 8080` and give me the public `https://...ngrok-free.app` URL.
3. If ngrok is not installed, install it and tell me the one command to add my auth token from https://dashboard.ngrok.com/get-started/your-authtoken.
4. Print the URL as a QR code in the terminal so I can scan it with my phone.

## When you finish

- Open the game in a headless mobile-sized browser, take a screenshot of the home screen and one round, and show them to me.
- Tell me the ngrok URL, the local URL, and how to stop both servers.
- Keep it simple. If any feature above makes the code fragile, drop it and tell me why.
