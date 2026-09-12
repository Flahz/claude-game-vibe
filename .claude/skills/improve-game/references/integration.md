# Integration and release

You asked for several changes to one 900-line file in parallel. Merging them is the part
of the run most likely to go wrong, and the part the user trusts you with most: a green
`main` is the whole deliverable. Take it slowly and test after every step.

## Reading the reports

For each subagent report, before merging anything:
- `STATUS: dropped` or `partial` with nothing usable: skip the branch, note why.
- `TOUCHED` lists a function you told it to stay out of: read that diff first; it is
  where the conflict will be.
- `TESTS` does not show every test passing: do not trust "it works". Run the suite
  yourself in that worktree. If red, treat the branch as partial.
- `DECISIONS` contradict the plan in a way that matters to the child: you may amend in
  integration, but prefer shipping the subagent's coherent version over a half-edit.

If a subagent never reported (crashed, timed out), look at its worktree: if there are
uncommitted changes that are close, commit them yourself and judge them like any other
branch. If it is a mess, drop it.

## Merge order and loop

```bash
git checkout -q -B improve/integration $BASE
# for each accepted branch, smallest and lowest-risk first, shared-core item last:
git merge --no-ff improve/<slug> -m "Merge improve/<slug>: <one line>"
<SKILL>/scripts/run-tests.sh . <out>/<slug>
```

Smallest first because early merges are cheap and give the later, harder ones a stable
base; the shared-core item last because it conflicts with the most things and you want
everything else settled when you resolve it.

## Resolving conflicts

A conflict means two items you both wanted touched the same lines. Resolve by keeping
both behaviours, not by picking a side. Read both diffs against the base
(`git diff $BASE...improve/<slug> -- index.html`) so you understand each change in full,
then write the merged function by hand. Common cases in this file:

- Both added a constant or helper near the top: keep both, order does not matter.
- Both added a key to `__bps.state()` or to `save()`: keep both keys.
- Both added a branch to `onTap` or `update`: order the branches so the earlier-returning
  one (bomb, wrong tap, paused) still comes first.
- Both edited `renderBook` or the celebration card: this is a layout conflict; after
  merging, take screenshots and Read them, because the tests will not catch a card that
  no longer fits an iPhone SE.
- Both changed the same CSS rule: merge the declarations; check for one overriding the
  other by specificity.
- Both bumped `sw.js` CACHE despite the brief: take either, you bump it again at release.

After every resolution, run the full suite. If a merged branch's own new test fails
after the merge, the merge broke it, not the branch: fix the merge. If you cannot get a
branch green within a reasonable effort, revert that merge (`git reset --hard` to the
commit before it if nothing else landed since, otherwise `git revert -m 1`), record the
reason, and move on. Shipping three good things beats shipping four with one broken.

If the repair is real work but clearly possible, spawn one fixer subagent with the
integration branch's worktree, the failing test output, and both original diffs, using
the same brief format. One round only.

## Release checklist

Every item, in order, on `improve/integration`:

1. `sw.js`: bump `CACHE` by one (`bps-cache-v9` to `v10`). Add every new file under
   `art/` or any other new asset to `FILES`. Remove entries for files that no longer
   exist. An installed phone only picks up the new game when this string changes.
2. `README.md`: the mode and difficulty tables, the Files table, and the Development
   section must describe the game as it now is. Add new tests to the Files table. Keep
   the tone; do not add a changelog section, the git log is the record.
3. Full test run. Green or you are not done.
4. Screenshots: if the home screen, a round, or the celebration changed visibly, refresh
   the matching PNGs in `screenshots/` with `shots.js` (Pixel 5) so the README pictures
   are honest.
5. Commit the release changes: `Release: <short list of what shipped>`.
6. Merge to the base and push:
   ```bash
   git checkout -q $BASE
   git merge --ff-only improve/integration
   git push -u origin $BASE
   ```
   If the fast-forward fails because the base moved, merge the base into the integration
   branch, rerun the tests, and try again. If the push is refused, retry a few times
   with a short backoff; if it is still refused, leave the work on `improve/integration`,
   push that branch if you can, and say so plainly in the report.
7. Clean up: `git worktree remove` each worktree, `git branch -D improve/<slug>` for each
   merged or dropped branch, and delete `improve/integration` once the base carries it.

## What "done" looks like

- `main` (or the restricted base) is fast-forwarded to a commit whose tree passes every
  test in `test/`.
- The service worker cache name changed exactly once since the previous release.
- The README describes the shipped game.
- No `improve/*` branches or worktrees remain.
- The report names each shipped item, each dropped item with a reason, and the leftover
  findings for next time.
