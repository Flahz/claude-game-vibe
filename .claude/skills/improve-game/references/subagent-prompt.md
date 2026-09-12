# The subagent brief

Every subagent gets the template below, filled in. The subagent has no memory of your
analysis, cannot see the other subagents, and cannot ask you anything, so everything it
needs is in the brief. Under-specified briefs produce work that is right in spirit and
wrong in detail; over-constrained briefs produce timid work. Give the goal and the
acceptance criteria precisely, the implementation loosely.

Spawn with the Agent tool: `subagent_type: general-purpose`, `run_in_background: true`,
one call per item, all in the same turn. Do not use worktree isolation on the Agent
call; you already made the worktree and the branch, and you need to know their names.

---

```
You are improving Bubble Pop Safari, a mobile web game for children aged 4 to 8. Work
ONLY inside this git worktree, which is already on its own branch:

  worktree: <ABSOLUTE PATH>      branch: improve/<slug>

Do not touch any other directory, do not switch branches, do not push. Commit on this
branch when done. You cannot ask questions; make every call yourself and note it in
your report.

## Your item: <title>

<One paragraph: what the child or parent experiences after this change, and why it
matters. Written so the agent understands the intent, not just the mechanics.>

## Acceptance criteria

- <observable behaviour 1>
- <observable behaviour 2>
- A Playwright test proves it: extend test/<file>.js or add test/<slug>.js using the
  same style (plain node script, `window.__bps` hook, PASS/FAIL, exit code). If the
  behaviour needs new state to be observable, add it to `__bps.state()` rather than
  poking the DOM.
- All existing tests still pass, and your new test passes three times in a row. Bubbles
  move and spawn on timers, so a test that taps "the target bubble" can hit a neighbour
  or a bubble that just left the screen; read the bubble list from `state()`, prefer a
  target with nothing overlapping it and well inside the viewport, and derive expected
  values from the game's own state rather than from a count you kept yourself.

## The game, in brief

index.html holds everything: CSS in <style>, the game in one <script>. No frameworks,
no build step, no new files except art and tests. The game must keep working offline,
make no network requests, load no fonts or libraries, and stay one file. Kids cannot
read: every new instruction needs a picture or a very short word, never a sentence.
Nothing may feel like losing. Tap targets are 80px or more. Use pointerdown for taps.
Keep the frame loop allocation-free; test/hard.js fails under 40fps on expert round 10.

Relevant code for your item:
- <function name>, index.html:<line>: <what it does and how your item relates>
- <...>

## Stay out of

These functions belong to other items being built in parallel this run. Do not edit them;
if your item truly cannot be done without touching one, do the minimum, keep it at the
very top or bottom of the function, and call it out in your report:
- <function list, or "none">

Do not change: the CACHE constant in sw.js (the lead bumps it once), README.md beyond
adding a line about your feature where it fits, the save key `bps.v3` or the shape of
the saved data (unless your brief says this item owns the save format), existing art files.

## How to verify

  <SKILL PATH>/scripts/run-tests.sh <WORKTREE> <WORKTREE>/../<slug>-test-out

runs every test against a temporary server on a free port. Run it before you start (it
must be green), after your change, and after any fix. To look at your work, start
`python3 -m http.server <any free port>` in the worktree and run
  NODE_PATH=$(npm root -g) node <SKILL PATH>/scripts/shots.js http://127.0.0.1:<port> <out-dir>
then Read the PNGs. Look at the iPhone SE ones: that is the smallest screen we support.

## When done

Commit with a clear message (what changed for the child, one line, then details).
Reply with exactly this structure:

  BRANCH: improve/<slug>
  COMMIT: <sha>
  STATUS: done | partial | dropped
  WHAT: <two or three sentences on what a child sees now>
  TESTS: <output of the last run-tests.sh summary line, plus the new test's name>
  TOUCHED: <functions and line ranges edited>
  DECISIONS: <anything you chose that the brief left open, one line each>
  LEFT: <anything not done, or "nothing">
```

---

## Filling it in well

- **Relevant code** is the most valuable section. You just read the whole file; the
  subagent has not. Three to six pointers with line numbers save it twenty minutes and
  keep it from re-implementing a helper that exists (`toast`, `sfx`, `artTag`, `confettiBurst`,
  `guideTalk`, `renderBook`, `save`).
- **Acceptance criteria** are things a test can check or a screenshot can show. "Feels
  more rewarding" is not one; "after the tenth sticker of a difficulty, the sticker book
  shows a trophy row and `state().trophies` lists it" is.
- **Stay out of** is what makes the merge cheap. Derive it from the plan: every function
  another item listed under `touches`.
- If the item owns the save format, say so and require a migration from every older key
  (`bps.v1`, `bps.v2`, `bps.v3`) with a test that loads an old-shape save.
- Name the test file. Two subagents both creating `test/features.js` is an avoidable
  conflict.
