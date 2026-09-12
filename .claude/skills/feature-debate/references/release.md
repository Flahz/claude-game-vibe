# Verify and release

The user trusts this skill with `main`, and `main` is the live game a child opens.
Everything below is what stands between a subagent's "done" and that child. Take it
in order and test after every step.

## Reading the builder's report

- `STATUS: dropped` or `partial` with nothing usable: do not ship. Write the reason in
  the decision record and release the record alone (see the end of this file).
- `TESTS` does not show the whole suite green and the new test passing repeatedly: do
  not trust "it works". Run it yourself in the worktree.
- `LEARNING RULE` says "no questions involved" but `TOUCHED` includes `spawnBubble`,
  `onTap`, `answerHtml`, `revealAnswer`, `guideTalk` or the speech bubble: read that
  diff yourself before believing it.
- `DECISIONS` contradict an acceptance criterion: the criterion wins unless the
  builder's reason is that the criterion was impossible; then reshape the criterion,
  record the change, and judge the coherent version the builder shipped.
- No report at all (crashed, timed out): inspect the worktree. Close-to-done
  uncommitted work you can finish yourself, commit and judge like any other; a mess
  is dropped.

## Verification, in the worktree

```bash
RUN=<repo>/.claude/skills/improve-game/scripts/run-tests.sh
SHOTS=<repo>/.claude/skills/improve-game/scripts/shots.js
$RUN <worktree> <out>/full                     # whole suite, green or stop
for i in 1 2 3 4 5; do NODE_PATH=$(npm root -g) node test/<new>.js http://127.0.0.1:<port> <out>/new-$i || echo FAIL $i; done
NODE_PATH=$(npm root -g) node $SHOTS http://127.0.0.1:<port> <out>/shots   # then Read the PNGs
```

The new test five more times because a test that passes once and fails one time in
four is the worst thing a run can leave on `main`: the next run starts red and cannot
tell the flake from its own regression. If it flakes, read the failure and fix the
test's timing or targeting (a polling wait instead of a fixed sleep, a target bubble
with nothing overlapping it); never delete or weaken an assertion.

Screenshots on all three devices (iPhone SE, Pixel 5, tablet): the home screen must
not scroll, the goal pill must not wrap into the play area, the celebration card
must fit an SE, new buttons are 80px or more, colour words are in their colour.

### The learning-rule review

Do this yourself, on the diff (`git diff main...feature/<slug> -- index.html`), and
by playing the feature in a Playwright script or by reading the test's screenshots
mid-round. Ask, in order:
1. During a round, is there anything new on screen that tells the child which bubble
   is right: a picture next to a word, a translation, a label on the target bubble
   that matches the question, a glow, a hint after a delay? If yes, it does not ship
   until it is gone.
2. Does a failure (hearts gone; three wrong tries where there are no hearts) reach
   `revealAnswer()` with `answerHtml()` showing the full answer, with taps ignored
   briefly, and does play continue afterwards? A new question type that never reaches
   the reveal teaches nothing from mistakes.
3. Is anything shown after a correct pop merely celebration, not a preview of the next
   answer?
4. Does a wrong tap still wiggle and not punish; is progress still never taken away?

If the diff is large or touches the round core, also spawn one reviewer subagent with
the teacher's lens, the diff, the decision record and these four questions, asking for
APPROVE or FIX with a list. It is cheap and it catches the kind thing a builder adds
without noticing.

One fix round: send the builder (SendMessage, or a fresh agent with the brief, the
diff and the findings) the exact list, then verify again from the top. Small things
(a CSS value, a wait in a test, a README line) you fix yourself in the worktree and
commit. A feature that is not green and rule-abiding after that round is not shipped
this run: say why in the decision record, keep the branch (do not delete it), and
release the record alone.

## Release checklist

On `feature/<slug>`, in the worktree, in order:

1. `sw.js`: bump `CACHE` by one (`bps-cache-v11` to `v12`), exactly once per run. Add
   every new file under `art/` to `FILES`. Installed phones only pick up the new game
   when this string changes.
2. `README.md`: the mode and difficulty descriptions, the Files table (new tests, new
   art count, and a `decisions/` row the first time the directory appears) and the
   Development section must describe the game as it now is. No changelog section; the
   git log and `decisions/` are the record.
3. `decisions/<date>-<slug>.md`: the decision record, final version, with any
   reshaping that happened during build or review noted under Decision.
4. Screenshots: if the home screen, a round, or the celebration changed visibly,
   refresh the matching PNGs in `screenshots/` with `shots.js` (Pixel 5) so the README
   pictures are honest.
5. Full test run, twice. Green both times or you are not done.
6. Commit the release changes: `Release: <feature title>`.
7. Fast-forward `main` and push:
   ```bash
   cd <repo>
   git checkout -q main
   git merge --ff-only feature/<slug>
   git push -u origin main
   ```
   `main` is always the target. If the fast-forward fails because `main` moved, merge
   `main` into the feature branch, rerun step 5, and try again. If the push is refused
   by the network, retry a few times with a short backoff. If the remote refuses
   writes to `main` (a protected branch), push `feature/<slug>` and say in the report
   exactly which branch holds the release and that `main` still needs the merge.
   If the harness gave you a working branch of its own (`claude/...`), point it at the
   same commit and push it too, so the harness branch and `main` never disagree:
   ```bash
   git branch -f <harness-branch> main && git push -u origin <harness-branch>
   ```
8. Artifact: the Claude artifact "Bubble Pop Safari"
   (https://claude.ai/code/artifact/9d71c4e8-aa71-48db-a733-bb636fa25b04) is a
   playable copy with the art inlined, because the artifact sandbox cannot load
   `art/*.webp` by path. Build it and republish to the same URL, never a new one:
   ```bash
   python3 <SKILL PATH>/scripts/inline-art.py <repo> <scratch>/bubble-pop-safari.html
   ```
   then the Artifact tool with `action: "read"` on that URL first (a publish to an
   artifact this session has not read is refused), then publish with `url` set to it
   and `file_path` set to the built file. Skip the favicon and icon on a republish.
   If the Artifact tool is not available, say so in the report; it is the one release
   step that is allowed to be missing.
9. Clean up: `git worktree remove <worktree>`, `git branch -D feature/<slug>` once
   `main` carries it.

## Releasing the record alone

When nothing ships (build dropped, or verification failed after the fix round), the
decision is still worth keeping: commit `decisions/<date>-<slug>.md` on `main` with a
message like `Decide: <title> (not built: <reason>)`, push `main`, and leave
`feature/<slug>` in place for a human or the next run. No cache bump, no README
change, no artifact republish, because the game did not change.

## What "done" looks like

- `main` on the remote is fast-forwarded to a commit whose tree passes every test in
  `test/`, twice.
- The service worker cache name changed exactly once since the previous release.
- `README.md` describes the shipped game; `decisions/` has this run's record.
- The artifact at the same URL plays the new version.
- No `feature/*` branch or worktree remains (unless a dropped build is deliberately
  kept, and the report says so).
- The report names the winner, the vote, the losers with reasons, the verification,
  and one line for the next debate.
