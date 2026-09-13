# Wiring a mode into the game

Every place a mode touches, in the order that builds cleanly (data, then the home screen,
then the engine, then the files around the game). `<id>` is the mode id (`letters`,
`clock`...): a short lowercase word used in `MODES`, `data-mode`, the round flag, the art
file, the test file. `<Name>` is what the button says ("Letters"). Grep for the anchors;
line numbers move with every commit. Math and Words are the two worked examples in the
file: when in doubt, find the `cur.math` or `cur.words` branch and add yours beside it.

Run `scripts/check-wiring.sh <worktree> <id>` when you think you are done; it greps for
most of these and lists what is missing.

## A. Data, at the top of the script

| # | Anchor | What to add |
| - | ------ | ----------- |
| A1 | `const ANIMALS = {` | `<id>:'<emoji>'`, the loading fallback for the icon (and one per new content art). |
| A2 | `const ART_SRC = {` | `<id>:'art/<id>.webp'` (and every new content art file). |
| A3 | after `WORDS_FREE` | The ladder: `const <ID> = [ {kind, ...}, x10 ]`, `function <id>Round(n){ return { <id>:true, quiz:true, kind:..., ...content, count:5, max:6+n, speed:1+(n-1)*0.05, colors:PLAY_COLORS, animals:STICKERS }; }`, and `const <ID>_FREE = { free:true, <id>:true, quiz:true, kind:'mix', ..., count:10, max:10, speed:1.25, colors:PLAY_COLORS, animals:STICKERS }`. `count` is the pops that earn the sticker (5 in the question modes), `max` the bubbles on screen. Content that depends on difficulty goes in the round as a triple like Math's `hi:[easy,hard,expert]` and is read with `diff==='easy'?0:diff==='hard'?1:2`. |
| A4 | `const MODES = [` | Add `'<id>'`. This alone gives the mode its own sticker table: `emptyBest`, `cleanTable` and `load` iterate `MODES`, and the save key stays `bps.v3`. Do not touch the save format. |
| A5 | `quiz:true` | Add `quiz:true` to `mathRound`, `MATH_FREE`, `wordRound`, `WORDS_FREE` as well, so the engine can ask `cur.quiz` instead of `cur.math||cur.words` (see C-notes). |

## B. Home screen

| # | Anchor | What to add |
| - | ------ | ----------- |
| B1 | `<div id="modes"` | `<button class="btn mode" data-mode="<id>" data-testid="mode-<id>" aria-label="<Name>"><img class="art" src="art/<id>.webp" alt="" data-fb="<emoji>"><span><Name></span></button>`. The pointerdown handler on `els.modes` picks it up; `renderBook` toggles `.on`. |
| B2 | `@media (max-width:429px)` and `(max-width:379px)` | Four buttons do not fit one line on a Pixel 5 at the current padding. Shrink `.btn.mode` padding and font, or keep only the icon on narrow phones (`.btn.mode span{display:none}` under 430px, icons are what a non-reader uses anyway), and check the home screen never scrolls on an iPhone SE (`mode-shots.js` reports it). Keep touch targets at 44px or more. |
| B3 | `#speech .say.math` | If the owl's text for your mode wants another size or spacing, add `#speech .say.<id>` and give the `.say` div that class in `renderGoal` and `answerHtml`. |
| B4 | `#home.words #langs` | Only if the mode has a picker of its own (like the language row): a hidden row shown by `#home.<id>`, toggled in `renderBook` next to `els.home.classList.toggle('words', ...)`, saved in `save()`/`load()`, exposed on `__bps`. Most modes need none. |

## C. Engine

| # | Anchor | What to add |
| - | ------ | ----------- |
| C1 | after `function wrongItem()` | The generator `new<Thing>()` and the distractor `wrong<Thing>()`. The generator fills `prob = { <id>:true, quiz:true, kind, ..., key, text }`: `key` is what a bubble is compared against, `text` what the owl says. Never the same question twice in a row (`newProblem` retries, `newWord` loops on the key). The distractor returns a plausible wrong value, prefers values not already on a bubble (`bubbles.some(b=>b.<field>===v)`), and never the answer. |
| C2 | `function nextQuestion()` | `else if(cur.<id>) new<Thing>();` |
| C3 | `function isTargetNow(b)` | Your comparison: `cur.<id> ? b.<field>===prob.key : ...`. This runs every frame for every bubble in `update`, so it is a field compare, not a computation. |
| C4 | `function spawnBubble(` | A branch beside `if(cur.words)`: decide `wantT` the way the others do (`forceTarget || (nonT>=2 && Math.random()<(cur.free?0.5:D.ratio))`), set the answer or a distractor, roll a bomb on wrong bubbles in hard/expert (`D.bombs>0 && bombs<2 && (Math.random()<D.bombs || bombT>6)`), set `isTarget`. Add your fields to the `let color, animal=null, ...` line, to the `if(bomb){...}` reset, and to the `bubbles.push({...})` literal. `color` is always set; use `'cloud'` for a neutral bubble that must give nothing away. |
| C5 | `function drawBubble(b)` | How a bubble shows its content. Short text (a letter, a time, a symbol): generalize the `if(b.num!=null)` branch to draw a string label (`b.label`) with the same font, rim and size rule, and let Math set `label` too rather than copying the branch. A drawing (a shape, a clock face): a small `draw<Thing>(b)` function using only `ctx` paths, no text measurement, no allocation, called inside the existing `ctx.save()`/`restore()`. The animal-in-bubble drawing is reused by setting `b.animal`. |
| C6 | `function goalText()` | The owl's words for each `kind`: short, uppercase for the thing to find, colour words through `cw()`. Never the answer. |
| C7 | `function renderGoal()` | The icons under the words: the pointing hand plus the question as a picture, dots (`.dots`), a `?` bubble (`<span class="gb big rainbow"><span class="q">?</span></span>`) or a small canvas/inline-SVG drawing. Same height budget as "Find 10" with two rows of dots. Give the `.say` div your class if B3 applies. |
| C8 | `function answerHtml()` | The reveal for each `kind`: the question again with the answer filled in, the picture or drawing, and the English or the rule when there is one (`<div class="en">`). This is the one place the answer is allowed on screen; it is only reached through `revealAnswer`, after a failure. |
| C9 | `function onTap(x,y)` | The float text after a right pop: extend `String(cur.math?best.num:cur.words?wordOf(best.item):progress)` with your bubble's content (celebration, not a hint). The `nextQuestion(); renderGoal();` branch after a pop tests `cur.math||cur.words`: make it `cur.quiz`. |
| C10 | `function update(dt)` | `b.isTarget=isTargetNow(b)` is guarded by `(cur.math || cur.words || !cur.free)`: make it `(cur.quiz || !cur.free)`. |
| C11 | `function loseRound()` | `if(cur.math||cur.words||D.teach) revealAnswer(...)`: make it `cur.quiz||D.teach`. Every question mode reveals on a lost round in every difficulty. |
| C12 | `function bubbleRadius()` | `(cur.words?6:0)` widens word bubbles; add your own term if the content needs room (two-digit times, a clock face). Bubbles are 42 to 54px radius before difficulty scaling; keep touch targets at 44px. |
| C13 | `function roundFor(n)` | `mode==='<id>' ? <id>Round(n) :` |
| C14 | `function startFree()` | `mode==='<id>'?<ID>_FREE:` |
| C15 | `function setMode(m, quiet)` | The toast: `m==='<id>' ? '<Name>!' :`. |
| C16 | `function goHome(party)` | The party toast: `mode==='<id>' ? '<Name> star!' :`. |
| C17 | `window.__bps = {` | `state().problem`: add a branch returning `{ kind, text, key, ...pieces }` so a test can tell right from wrong bubbles and check the owl shows the question and not the answer. Add your bubble field(s) to the `bubbles:` map (`label`, `shape`, `time`...). |

Notes on C:
- `prob` is `null` outside a round; every helper that reads it is only called while
  `screen==='play'`. `nextQuestion()` resets `wrongTries` and the glow; do not reset them
  yourself.
- Free play (`cur.free`) has no hearts; three wrong tries on one question reveal the answer
  and move on. Your `<ID>_FREE` must set `free:true` and the mode flag both.
- Hard and expert bombs come from your `spawnBubble` branch, ordered goals (`seq`) do not
  apply to question modes (`buildSeq` returns null when `cur.math`; add `cur.quiz` there).
- Sounds: a right pop is `sfx.pop`, wrong is `sfx.wrong`; no new sounds are needed. If you
  add one, it goes through `tone()` and respects `muted`.

## D. Files around the game

| # | File | What to add |
| - | ---- | ----------- |
| D1 | `art/<id>.webp` | The icon, 208x208, transparent. Any content art likewise. |
| D2 | `sw.js` | `'./art/<id>.webp'` (and content art) in `FILES`. `CACHE` is bumped once, at release. |
| D3 | `README.md` | A row in the "Three games" table (make it "Four games" and fix the sentence above it), the art count in the Files table, a `test/<id>.js` row, the `setMode(...)` list in Development. |
| D4 | `manifest.webmanifest` | Add the subject to `description` ("...learn words in another language and the letters..."). |
| D5 | `test/<id>.js` | From `assets/mode-test-template.js`. |
| D6 | `test/lives.js` | `isRight` (how a bubble is judged right for your mode) and `noGiveaway` (what must not be on screen); add a short easy-mode step for the mode if the existing ones fit in the time budget. |
| D7 | `decisions/<date>-mode-<id>.md` | The design record, final version. |
| D8 | `.claude/skills/improve-game/scripts/shots.js` | Optional: a `home-<id>` shot so future runs of the sibling skills see the mode. |
