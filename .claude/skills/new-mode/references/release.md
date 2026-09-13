# Verify and release

`main` is the live game a child opens. Everything below stands between "it works in my
worktree" and that child. Take it in order and test after every step.

## Verification, in the worktree

```bash
RUN=<repo>/.claude/skills/improve-game/scripts/run-tests.sh
$RUN <worktree> <out>/full                      # whole suite, green or stop
$RUN <worktree> <out>/full2                     # and again: a suite that passes once in two is red
python3 -m http.server <port> --bind 127.0.0.1 &   # from the worktree
for i in 1 2 3 4 5; do NODE_PATH=$(npm root -g) node test/<id>.js http://127.0.0.1:<port> <out>/new-$i || echo FAIL $i; done
(cd <repo> && python3 -m http.server <port2> --bind 127.0.0.1 &)   # the main checkout, the baseline for layout
NODE_PATH=$(npm root -g) node <SKILL PATH>/scripts/mode-shots.js http://127.0.0.1:<port> <out>/shots <id> 1,5,10 --base http://127.0.0.1:<port2>
```

The new test five more times because a test that passes once and fails one time in four
is the worst thing a run can leave on `main`: the next run starts red and cannot tell the
flake from its own regression. If it flakes, read the failure and fix the test's timing
or targeting (a polling wait instead of a fixed sleep, a target with nothing overlapping
it, a wrong bubble well below the owl's pill); never delete or weaken an assertion.

`mode-shots.js` exits non-zero on a layout regression against main (the home screen
scrolls where main's does not or by more, the mode row takes more lines than on main, a
button shrank below main's, the owl's pill is taller than Math's tallest); the container
renders `system-ui` with a wider fallback font than a phone, which is why it compares
rather than measures. Then Read every PNG anyway. On the iPhone SE: four mode buttons on
one line or icon-only, the owl's bubble with your prompt no taller than Math's "Find 10"
with dots, the celebration card fits. On the Pixel 5: the round looks like the other
modes' rounds (same bubble sizes, same pill). New buttons 44px or more.

### The learning-rule review

Do this yourself on the diff (`git diff main...mode/<id> -- index.html`) and on the
mid-round screenshots, then have one reviewer subagent (general-purpose, the teacher's
lens, given the diff, the design record and these questions) answer APPROVE or FIX with a
list; without a subagent tool, write the five answers yourself before touching the code
again. Ask, in order:

1. During a round, does anything on screen say which bubble is right: the thing's name
   next to its picture, the shape or clock face in the prompt when the bubbles carry the
   same, the answer letter or digit in the text, a glow, a hint after a delay? Anything
   found does not ship until it is gone.
2. Does every round kind reach `revealAnswer()` after a failure (hearts gone, or three
   wrong tries where there are no hearts) with `answerHtml()` showing the whole answer,
   taps ignored for the reveal, and the level then ending as the others do? A kind that
   never reaches the reveal teaches nothing from mistakes.
3. Is what appears after a right pop celebration of that pop only, not a preview of the
   next answer?
4. Does a wrong tap still wiggle and cost exactly one heart; is progress never taken away;
   is the third miss the end of the level with nothing recorded?
5. Are the wrong bubbles neighbours of the answer (a child has to think) rather than
   random (a child can guess)? A mode that fails this is playable but not a lesson;
   fix the distractor function.

Two fix rounds at most, each followed by the whole verification again. Not green and
rule-abiding after that: say why in the design record, keep the branch, release the
record alone (below).

## Release checklist

On `mode/<id>`, in the worktree, in order:

1. `sw.js`: bump `CACHE` by one (`bps-cache-v15` to `v16`), exactly once for the run. Every
   new file under `art/` is in `FILES`. Installed phones only pick up the new game when
   this string changes.
2. `README.md`: the games table has the new row and says how many games there are; the
   Files table counts the art and lists `test/<id>.js`; the Development section's
   `setMode(...)` list names the mode. No changelog section; the git log and `decisions/`
   are the record.
3. `manifest.webmanifest`: the description names the new subject.
4. `decisions/<date>-mode-<id>.md`: the design record, final, with "Changes during the
   build" filled in.
5. Screenshots: `screenshots/<id>-home.png` and one round of the mode (Pixel 5), from the
   mode-shots output, so the README can show it; refresh `home.png` since the button row
   changed.
6. Full test run, twice. Green both times or you are not done.
7. Commit the release changes: `Release: <Name> mode`.
8. Fast-forward `main` and push:
   ```bash
   cd <repo>
   git checkout -q main
   git merge --ff-only mode/<id>
   git push -u origin main
   ```
   `main` is always the target. If the fast-forward fails because `main` moved, merge
   `main` into the mode branch, rerun step 6, try again. If the push is refused by the
   network, retry with a short backoff. If the remote refuses writes to `main`, push
   `mode/<id>` and say in the report which branch holds the release and that `main`
   still needs the merge. If the harness gave you a working branch of its own
   (`claude/...`), point it at the same commit and push it too, so the two never
   disagree:
   ```bash
   git branch -f <harness-branch> main && git push -u origin <harness-branch>
   ```
9. Artifact: the Claude artifact "Bubble Pop Safari"
   (https://claude.ai/code/artifact/9d71c4e8-aa71-48db-a733-bb636fa25b04) is a playable
   copy with the art inlined, because the artifact sandbox cannot load `art/*.webp` by
   path. Build and republish to the same URL, never a new one:
   ```bash
   python3 <repo>/.claude/skills/feature-debate/scripts/inline-art.py <repo> <scratch>/bubble-pop-safari.html
   ```
   then the Artifact tool with `action: "read"` on that URL first (a publish to an
   artifact this session has not read is refused), then publish with `url` set to it and
   `file_path` set to the built file. Skip the favicon and icon on a republish. If the
   Artifact tool is not available, say so in the report; it is the one release step
   that is allowed to be missing.
10. Clean up: `git worktree remove <worktree>`, `git branch -D mode/<id>` once `main`
    carries it.

## Releasing the record alone

When nothing ships, the design is still worth keeping: commit
`decisions/<date>-mode-<id>.md` on `main` with "Not built because" filled in, message
`Design: <Name> mode (not built: <reason>)`, push `main`, leave `mode/<id>` in place. No
cache bump, no README change, no artifact, because the game did not change.

## What "done" looks like

- `main` on the remote is fast-forwarded to a commit whose tree passes every test in
  `test/`, twice, including `test/<id>.js`.
- The home screen has a fourth button with custom art; it does not scroll on an iPhone SE.
- The service worker cache name changed exactly once since the previous release.
- `README.md` describes the shipped game; `decisions/` has this run's record;
  `manifest.webmanifest` names the subject.
- The artifact at the same URL plays the new mode.
- No `mode/*` branch or worktree remains (unless a dropped build is deliberately kept,
  and the report says so).
- The report names the mode, the ladder, how the learning rule holds, the verification,
  and the next subject.
