# The builder brief

The builder has no memory of the debate, cannot see you, and cannot ask. Everything it
needs is in the brief: the goal in the child's terms, the acceptance criteria from the
decision record word for word, the code it will touch with line numbers, the rules,
the test command, and the report format. Give the goal and the criteria precisely
and the implementation loosely; the builder is a capable engineer and does its best
work when it understands why the feature matters rather than being handed a recipe.

Spawn with the Agent tool: `subagent_type: general-purpose`, `run_in_background: true`.
Do not use the Agent tool's worktree isolation; you already made the worktree and the
branch and you need their names.

---

```
You are adding one feature to Bubble Pop Safari, a mobile web game that helps children
aged 4 to 8 learn colours, animals, counting, arithmetic and foreign words while
having fun. Work ONLY inside this git worktree, which is already on its own branch:

  worktree: <ABSOLUTE PATH>      branch: feature/<slug>

Do not touch any other directory, do not switch branches, do not push. Commit on this
branch when done. You cannot ask questions; make every call yourself and note it in
your report.

## The feature: <title>

<One paragraph from the decision record: what the child or parent experiences after
this change and why the debate chose it. Include the deciding argument so the builder
knows what matters most and what to protect if it has to cut something.>

## Acceptance criteria

- <observable behaviour 1, from the decision record>
- <observable behaviour 2>
- <...>
- A Playwright test proves it: extend test/<file>.js or add test/<slug>.js in the same
  style (plain node script, `window.__bps` hook, PASS/FAIL, exit code). If the
  behaviour needs new state to be observable, add it to `__bps.state()` rather than
  poking the DOM.
- All existing tests still pass, and your new test passes three times in a row.
  Bubbles move and spawn on timers, so a test that taps "the target bubble" can hit a
  neighbour or a bubble that just left the screen: read the bubble list from
  `state()`, prefer a target with nothing overlapping it and well inside the
  viewport, derive expected values from the game's own state, and wait for state
  changes with a polling wait rather than a fixed sleep.

## The learning rule (non-negotiable)

1. Never show the answer while the child is still trying. During a round nothing on
   screen may give it away: no picture of the target next to a foreign word, no
   translation, no matching name tag on the bubble, no highlighted "right" bubble, no
   hint after a delay. The child has to think, remember, count or guess.
2. Reveal the answer only after a failure: all hearts gone (hard, expert), or three
   wrong tries on one question (easy, free play). Then the owl's bubble shows the
   full answer, the correct bubbles glow, taps are ignored for a couple of seconds,
   and play continues. Go through `revealAnswer()` and `answerHtml()`
   (index.html:<lines>); do not invent a second reveal path.
3. A correct answer may be celebrated: after a right pop it is fine to show what was
   popped.
If your feature has no questions or answers, say so in your report and move on; if it
does, your test must include a check that nothing on screen gives the answer away
during play (see test/words.js for the pattern).

## The game, in brief

index.html holds everything: CSS in <style>, the game in one <script>. No frameworks,
no build step, no new files except art and tests. The game must keep working offline,
make no network requests, load no fonts or libraries, and stay one file. Kids cannot
read: every new instruction is a picture or a very short word in the owl's bubble,
with colour words in their colour; feedback is a big pop-up word. Nothing may feel
like losing; wrong taps wiggle, progress and stickers are never taken away. Tap
targets are 80px or more. Use pointerdown for taps. Keep the frame loop
allocation-free; test/hard.js fails under 40fps on expert round 10. Music and sounds
are Web Audio, no audio files; the sound button mutes everything, including anything
you add. Art is custom webp in art/ (208px), emoji only as the loading fallback;
new art files are listed for you below, or there are none and you reuse what exists.

Relevant code for this feature:
- <function name>, index.html:<line>: <what it does and how the feature relates>
- <...>
Helpers that exist, do not reimplement: toast, sfx, artTag, confettiBurst, guideTalk,
renderBook, save/load, revealAnswer/answerHtml, spawnBubble(forceTarget).

New art (already in art/ in your worktree, add each to ART_SRC and to FILES in sw.js):
<list, or "none">

Do not change: the CACHE constant in sw.js (the lead bumps it once at release), the
save key `bps.v3` or the shape of the saved data unless this brief says the feature
owns the save format (then migrate every older key and add a test that loads an
old-shape save), existing art files, README.md beyond a line about the feature where
it fits.

## How to verify

  <RUN-TESTS PATH> <WORKTREE> <WORKTREE>/../<slug>-test-out

runs every test against a temporary server on a free port. Run it before you start (it
must be green), after your change, and after any fix. To look at your work, start
`python3 -m http.server <free port>` in the worktree and run
  NODE_PATH=$(npm root -g) node <SHOTS PATH> http://127.0.0.1:<port> <out-dir>
then Read the PNGs. The iPhone SE ones are the smallest screen we support, and the
home screen must never scroll on any of them.

## When done

Commit with a clear message (what changed for the child, one line, then details; no
model names). Reply with exactly this structure:

  BRANCH: feature/<slug>
  COMMIT: <sha>
  STATUS: done | partial | dropped
  WHAT: <two or three sentences on what a child sees now>
  LEARNING RULE: <how the feature keeps it, or "no questions or answers involved">
  TESTS: <the run-tests.sh summary line, plus the new test's name and its pass count>
  TOUCHED: <functions and line ranges edited>
  DECISIONS: <anything you chose that the brief left open, one line each>
  LEFT: <anything not done, or "nothing">
```

---

## Filling it in well

- **Relevant code** is the most valuable section. You read the whole file during the
  frame phase; the builder has not. Four to eight pointers with line numbers save it
  twenty minutes and keep it from duplicating a helper.
- **Acceptance criteria** come from the decision record unchanged, so the record, the
  build and the review all agree on what "done" means. Each one is checkable by a test
  or visible in a screenshot; "feels rewarding" is not a criterion, "after the fifth
  round in a row the celebration card shows a streak flame and `state().streak` is 5"
  is.
- **The learning rule** section stays even for features with no questions: it is
  cheap, and a builder who adds "a little hint" out of kindness breaks the game's
  purpose.
- Name the test file. Prefer extending the mode's existing test when the feature
  belongs to one mode, a new `test/<slug>.js` when it spans modes.
