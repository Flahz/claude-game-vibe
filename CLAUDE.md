# Bubble Pop Safari — guide for anyone (human or Claude) changing this game

## Purpose

This app exists to help young children (about 4 to 8 years old) **learn while having fun**: colors and
animals, numbers and arithmetic, words in another language. Fun is the vehicle, learning is the goal.
Every change must serve both. If a feature makes the game more fun but stops the child from thinking,
it does not belong here.

## The learning rule (non-negotiable, applies to every mode, current and future)

1. **Never show the answer while the child is still trying.** During a round nothing on screen may give
   the answer away: no picture of the target next to a foreign word, no English translation under it,
   no name tag on the bubble that matches the question, no highlighted "right" bubble, no hint that
   appears after a few seconds. The child has to think, remember, count, or guess.
2. **Reveal the answer only after a failure, so the child can learn from it.** A failure is:
   - losing the round: every level in every difficulty has three lives, a wrong tap (in hard or expert also
     a bomb or a timeout) costs a heart, and the third miss is dead; or
   - in free play, which has no hearts, three wrong tries on the same question.
   At that moment the owl's bubble shows the full answer (the word with its picture and English meaning,
   the equation with its result, the animals goal with its bubble), the correct bubbles glow, taps are
   ignored for a couple of seconds, and then the level is over: back to the home screen, nothing recorded,
   and Play starts the same level again from zero (in free play, which has no hearts, a new question).
3. **A correct answer may be celebrated.** After a right pop it is fine to show the word or number that
   was just popped; that is reinforcement, not a giveaway.
4. Any new mode (letters, shapes, another language, anything) follows the same three points. Put the
   reveal through `revealAnswer()` / `answerHtml()` in `index.html` rather than inventing a new path.

## Other rules that shape the game

- **Kids first.** Ages 4 to 8: big touch targets (≥ 44px), short words, no reading required to play
  the animals mode, no dead ends, no game-over screen (a failed level just goes back to the home screen),
  no ads, no network calls, works offline.
- **No voice.** Instructions are on screen as short bold text in the owl's bubble, with color words in
  their color. Feedback is big pop-up words ("Round 3", "Oops!", "Try again!", "Look!").
- **Never punish, always continue.** Wrong taps wiggle. Losing all three hearts fails the level: the owl
  shows the answer, then the home screen, and Play tries it again. Stickers are never taken away, and nothing
  about hearts is ever shown on the home screen.
- **Custom art only.** All characters and interface icons are generated with Higgsfield and cut out into
  small webp files in `art/` (208px). Emoji are used only as a fallback while an image loads. New art goes
  through the same pipeline and into the service worker file list.
- **Three difficulties, same rounds, three lives each.** Easy = the gentle original plus the three hearts
  (a wrong tap costs one, the third fails the level); easy never records stars. Hard/expert add speed,
  bombs, ordered goals, a timer, colour-shifting bubbles. A difficulty must never remove learning, only add
  challenge.
- **Each mode keeps its own stickers and stars** (save format `bps.v3`, migrate older formats, never
  wipe a child's progress).
- **Music and sounds are generated with Web Audio.** No audio files. The sound button mutes everything.

## Where things live

- `index.html` — the whole game (CSS, HTML, JS). Single file, no build step, no dependencies.
- `sw.js` — cache-first service worker. **Bump `CACHE` on every release** and list any new asset in `FILES`.
- `manifest.webmanifest`, `icon-*.png` — add to home screen.
- `art/*.webp` — all art. `test/*.js` — Playwright tests. `screenshots/` — README images.
- `.nojekyll` — GitHub Pages serves `main` as-is.

## Workflow

- Develop on the feature branch, then fast-forward `main`. **Every push to `main` deploys** to
  https://flahz.github.io/claude-game-vibe/ within a minute (GitHub Pages, source: `main`, root).
- Before pushing, run the test suites against a local server (`python3 -m http.server 8951`):
  `test/smoke.js` (animals, pass a device name), `test/hard.js`, `test/math.js`, `test/words.js`,
  all with `NODE_PATH=/opt/node22/lib/node_modules node test/<name>.js http://127.0.0.1:8951 <outDir>`.
  A change to a mode needs its test updated in the same commit.
- The test hook `window.__bps` (`state()`, `startRound(n)`, `setMode()`, `setDifficulty()`,
  `setLanguage()`, `unlockAll()`, `resetProgress()`) is the contract the tests use; keep it working.
- Check the layout on a small phone (iPhone SE), a normal one (Pixel 5) and a tablet; the home screen
  must never scroll.
- Also republish the Claude artifact (same URL) with the art inlined as data URIs when the game changes.
- Commit messages describe the change for a reader; never include model identifiers in code or commits.
