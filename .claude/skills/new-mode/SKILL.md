---
name: new-mode
description: Add a complete new learning mode to Bubble Pop Safari (this repo's kids' game), the way Math and Words were added - a fourth game button on the home screen with its own ten-round ladder, question generator, bubbles, owl prompt, answer reveal, sticker book, icon, Playwright test, README row, cache bump, release to main and artifact republish. Use this whenever the user asks for a new mode, a new game or subject in the app, "something like math but for X", letters, spelling, shapes, telling time, patterns, comparing numbers, division, harder content for the older kids, or "another thing to learn", even if they never say "mode". Pass a subject ("/new-mode letters") or none to pick the next one from the catalog; pass `--design-only` to stop after the design record. For a change to an existing mode use improve-game or just make it; for a single small feature use feature-debate.
---

# New mode

You are the designer, the builder and the release engineer for this run. The user has
delegated the whole thing: what the mode teaches, how each round escalates, how it looks,
how it is tested, and when it ships. Do not ask the user questions. A run that ends with
a question is a failed run; a run that made a defensible call the user might have made
differently is a success. A run that ends with a mode a child can play on the live site
is the point.

Arguments (all optional): `/new-mode [subject...] [--design-only]`
- `subject`: what the mode teaches ("letters", "shapes", "clock", "spelling", "bigger or
  smaller", "division", "patterns"...). Free text; map it onto the closest catalog entry
  or design a new one in the same shape. Without it, take the first catalog entry that
  is not yet in the game.
- `--design-only`: stop after the design record; nothing is built or pushed.

The game: `index.html` (HTML, CSS, JS inline, no build step, no dependencies), custom art
in `art/*.webp`, a cache-first service worker in `sw.js`, and Playwright tests in `test/`
driving the game through `window.__bps`. `CLAUDE.md` holds the rules every change must
follow, above all the learning rule. GitHub Pages serves `main`, so the push to `main` at
the end is the release.

## What a mode is, in this codebase

Every mode is the same machine with different parts. Bubbles rise; the owl's bubble asks
for something; some bubbles are the answer (`isTarget`) and the rest are wrong; a right
pop fills the star bar, a wrong one wiggles and costs a heart; after the third miss the
owl reveals the answer and the level is over. A mode supplies exactly these parts:

1. **A ladder**: ten round definitions (`const LETTERS = [...]` plus `letterRound(n)`) and a
   free-play object, each round an object with a mode flag (`letters:true`), a `kind`,
   the content of the round, and `count`, `max`, `speed`, `colors`, `animals`.
2. **A question generator** (`newLetter()` in the style of `newProblem()` / `newWord()`)
   that fills `prob` with the question, its answer key, and `text` for the owl, never the
   same question twice in a row.
3. **What a bubble carries** (a branch in `spawnBubble`): the answer on target bubbles,
   plausible distractors on the others, bombs in hard and expert, and how it is drawn
   (a branch in `drawBubble`, or reuse of the number, word or animal drawing).
4. **The owl's question** (`goalText()` + `renderGoal()`): short, big, with colour words in
   their colour; a picture or dots where a four-year-old cannot read; and never the answer.
5. **The reveal** (`answerHtml()`): the full answer after a failure, so the mistake teaches.
6. **Difficulty**: easy, hard and expert use the same ten rounds; the round content grows
   with difficulty (a bigger range, more choices, the word instead of the picture), and
   the shared engine already adds speed, bombs, the timer and hearts.
7. **A home-screen button** with a custom icon, its own sticker book and stars (the save
   format handles any id in `MODES`), a Playwright test, a README row, and a release.

`references/wiring.md` lists every place in `index.html`, `sw.js`, `README.md`,
`manifest.webmanifest` and `test/` that a mode touches, with the pattern Math and Words
used at each one. `scripts/check-wiring.sh <repo> <id>` greps for all of them and prints
what is still missing; it is how you know you are done wiring, not how you start.

## The shape of a run

```
1. Read      the game, the rules, the tests, previous mode records; green baseline
2. Design    choose the subject, write the design record (ladder, bubbles, prompt, reveal)
3. Art       the mode icon, plus any content art the design needs
4. Build     one worktree, wiring.md top to bottom, check-wiring.sh, the test
5. Verify    suite twice, new test five times, three devices, learning-rule review
6. Release   cache bump, README, manifest, design record, fast-forward main, push, artifact
7. Report
```

`<SKILL PATH>` below is this skill's directory (normally `<repo>/.claude/skills/new-mode`);
resolve it to an absolute path once. The test runner and the artifact builder are shared
with the sibling skills: `<repo>/.claude/skills/improve-game/scripts/run-tests.sh` and
`<repo>/.claude/skills/feature-debate/scripts/inline-art.py`. If a sibling is gone, run
the tests as `CLAUDE.md` describes and inline the art with a short script of your own.

Read the reference file for each phase when you reach it:
- `references/mode-catalog.md` - subjects worth a mode, each with a ladder and its traps
- `references/design-record.md` - the record you write before building and commit at release
- `references/wiring.md` - every touch point, in build order, with the existing pattern
- `references/release.md` - verification, the learning-rule review, the release checklist

## 1. Read

Read all of `index.html` (it is one file and the mode you add threads through most of
it), `CLAUDE.md`, `README.md`, `sw.js`, `manifest.webmanifest`, every file in `test/`,
and every `decisions/*mode*.md` (previous runs of this skill: the subjects already taken,
the ideas they rejected, what went wrong in their build). `git log --oneline -20` tells you
what the last runs of any skill changed.

Run the suite once (`run-tests.sh <repo> <out>`). If `main` is red on a clean checkout,
fixing that is part of this run's release, not a reason to stop. Skip the run with
`--design-only`.

While reading, note the line of every function in the wiring list; you will edit most of
them and the numbers drift with every commit, so grep for names, not lines.

## 2. Design

Pick the subject. With an argument, map it to the catalog entry it resembles most, or
design one in the same shape if none fits. Without one, take the first catalog entry
not yet in the game (a mode is "in the game" when its id is in `MODES`). The user asked
for "harder stuff": prefer subjects that stretch the older end of the range (6 to 8)
while the easy rounds stay playable by a four-year-old who cannot read. Do not re-skin an
existing mode (another language is a Words setting, not a mode; bigger numbers are a
Math round, not a mode). A new mode teaches something the three existing ones do not.

Then write the design record from `references/design-record.md` to a scratch file. The
record decides, before any code, the ten rounds with what each one asks in easy, hard and
expert; what a target bubble and a wrong bubble carry and how they are drawn; the owl's
question text and icon for each round kind; the reveal; the art; the test plan. Hold every
line of it against the learning rule as you write: the commonest way a new mode fails
review is a question that carries its own answer (the picture of the thing next to the
letter it starts with, the shape drawn next to its name, the answer digit in the prompt).
When you cannot make a round both readable by a four-year-old and answer-free, make it
answer-free and give the easy difficulty a picture or dots instead of a word.

With `--design-only`, print the record in the final message, leave it in the scratch dir,
and stop. Otherwise the record is committed under `decisions/` at release, updated with
whatever changed during the build.

Decisions are final for the run. If the build shows a round is impossible as designed,
reshape that round to the slice that works and note it in the record; do not start over.

## 3. Art

The mode needs one icon, `art/<id>.webp`, 208 by 208, transparent background, in the house
style (flat, friendly, thick dark outline, bright fills, a soft drop shadow: look at
`art/math.webp` and `art/words.webp`). Some designs also need content art (shapes are
better drawn on the canvas; a clock face is better drawn on the canvas; a set of objects
to count is better reused from the ten animals). Prefer designs whose content needs no new
files; every new file is a Higgsfield round trip, a cutout, a `FILES` entry and an
`ART_SRC` entry.

Make the icon with the Higgsfield tools if they are available to you (ToolSearch for
`generate_image`): a 1024px square, "a single flat cartoon icon of <thing>, thick dark
outline, bright colours, no text, centered, plain white background", then cut it out and
shrink it:

```bash
python3 <SKILL PATH>/scripts/cutout.py <downloaded.png> <worktree>/art/<id>.webp
```

If Higgsfield is not available, or the result is not in the house style after two tries,
draw the icon with the fallback script; it makes a bold-letter badge in the game's own
bubble style, which is what the Words icon is:

```bash
python3 <SKILL PATH>/scripts/make-icon.py --text "Aa" --color "#2f7cff" <worktree>/art/<id>.webp
```

Look at the result (Read the file, or put it on a contact sheet next to `art/math.webp`).
An icon a child cannot tell from the others at 34px is not done.

## 4. Build

One worktree, one branch, base `main` up to date with the remote:

```bash
REPO=$(git rev-parse --show-toplevel)
WT=$(dirname "$REPO")/$(basename "$REPO")-worktrees
git fetch origin main && git checkout -q main && git merge -q --ff-only origin/main
git worktree add -q "$WT/<id>" -b "mode/<id>" main
```

Build it yourself, in the worktree, following `references/wiring.md` top to bottom. You
hold the whole design and have just read the whole file; handing that to a builder
subagent loses both and gains nothing, because a mode is one coherent change to one file,
not parallel work. Use subagents, when you have them, for what runs alongside you: one to
generate and cut out the icon while you wire, and later one reviewer with the teacher's
lens (section 5). Without them, make the icon first and review last; neither needs to be
parallel to be done.

Things the wiring reference says that are worth saying twice:

- A third question mode makes `cur.math||cur.words` chains silly. Add `quiz:true` to your
  round objects and to the Math and Words ones, and test `cur.quiz` where the engine asks
  "does this mode have questions": `nextQuestion`, `onTap`, `update`, `loseRound`,
  `bubbleRadius`. Additive flags break nothing; leaving three modes on two different
  mechanisms breaks the next run.
- If your bubbles carry short text (a letter, a time, a symbol), generalize the number
  drawing in `drawBubble` to a string label rather than copying it. If they carry a
  drawing (a shape, a clock face), add a small canvas function that uses only paths and
  allocates nothing per frame; `test/hard.js` measures the frame rate on expert round 10
  and fails under 40 fps, and a bubble that calls `measureText` or builds objects every
  frame drags every mode down on a cheap phone.
- Distractors are the difficulty. A letters round whose wrong bubbles are random letters
  is a guessing game at any speed; wrong bubbles that are neighbours of the answer (the
  letters around it, the times ten minutes off, the shape with one more side) are the
  thinking. Write the `wrong<Thing>()` function with the same care as the generator,
  and prefer distractors not already on screen (see `wrongNum`).
- The owl's bubble must not grow. Everything you put in `renderGoal` fits the height of
  "Find 10" with its dots on an iPhone SE, or the play area shrinks for every mode.
- `__bps.state().problem` must expose enough for a test to know the right answer and to
  check nothing on screen gives it away: the kind, the text the owl shows, the answer key,
  and the pieces the reveal will show.

When the wiring is done, run the checker and do not argue with it:

```bash
<SKILL PATH>/scripts/check-wiring.sh <worktree> <id>
```

Then write `test/<id>.js` from `assets/mode-test-template.js`: it is the shared preamble
of every mode test with the mode-specific parts marked `TODO`. Fill in the round checks
for every `kind` in the ladder, the "nothing on screen gives the answer away" check for
every round kind, the third-miss reveal in easy, a lost round in hard, separate progress,
and one expert round. Register the mode in `test/lives.js` (`isRight` and `noGiveaway`)
so the shared hearts test covers it too.

Commit on `mode/<id>` with a message a reader can follow: what the child sees, then the
parts (ladder, bubbles, prompt, reveal, test). Never a model name in a commit.

## 5. Verify

Follow the verification half of `references/release.md`. In short: the full suite in the
worktree, twice; the new test five more times; `scripts/mode-shots.js` on the three
devices with `--base` pointing at a server on the `main` checkout (the container's fallback
fonts are wider than a phone's, so the script judges regressions against main rather than
absolute sizes), then Read the PNGs (the home screen must not scroll more than it does on
main, the mode row must not gain a line, the owl's bubble must not push the play area
down); then the learning-rule review of the diff, which is the one review a kids' learning
game cannot skip. Spawn one reviewer subagent with the teacher's lens for it, with the
diff, the design record and the five questions in the reference; a builder is blind to
the hint it added out of kindness. If you cannot spawn agents, do that review yourself,
from the diff and the mid-round screenshots, answering the five questions in writing
before you touch the code again.

Fix what the review finds and verify again from the top. A mode that is not green and
rule-abiding after two fix rounds is not shipped this run: say why in the design record,
keep the branch, release the record alone.

## 6. Release

Follow the release half of `references/release.md`: bump `CACHE` in `sw.js` once and list
the new art; add the mode's row to the README tables and the test hook line; add the
subject to the manifest description; commit the design record under `decisions/`; refresh
the screenshots the README shows; run the tests twice more; fast-forward `main` and push
it. `main` is always the target; that is the point of this skill. If the harness gave you
a working branch of its own, point it at the same commit and push it too. Republish the
Claude artifact with the art inlined. Remove the worktree and the `mode/*` branch.

## 7. Report

The final message is the only thing the user reads. Lead with the mode's name, what a
child learns in it, and where it is playable. Then: the ladder in ten short lines (round,
easy ask, expert ask); how the learning rule holds in each round kind; how it was
verified (tests, devices, the review's findings and fixes); what was reshaped during the
build; and the one subject the next run should take. No question at the end.
