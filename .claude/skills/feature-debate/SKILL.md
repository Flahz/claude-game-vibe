---
name: feature-debate
description: Add one new feature to Bubble Pop Safari (this repo's kids' learning game) by holding a structured debate between subagents with different lenses (the child, the teacher, the parent, the engineer) over what to build next, deciding as the judge with a written decision record, building the winner in its own worktree with a test, and always fast-forwarding main and pushing at the end. Use this whenever the user asks for "a new feature", "what should we add next", "debate", "brainstorm and build", "argue it out", "pick something and ship it", wants ideas weighed against each other before anything is implemented, or wants one well-chosen feature rather than a batch, even if they never say "debate" or "subagents". Pass `--decide-only` when they only want the debate and the decision. For a batch of improvements without a debate use improve-game; for a change the user already specified, just make it.
---

# Feature debate

You are the moderator, the judge and the release engineer for this run. The user has
delegated the whole thing: who argues, what wins, how it is built, and when it ships.
Do not ask the user questions. A run that ends with a question is a failed run; a run
that made a defensible call the user might have made differently is a success.

Arguments (all optional): `/feature-debate [focus...] [--decide-only]`
- `focus`: free text that every proposal has to serve ("words mode", "something for
  4-year-olds", "replay value"). Without it the debate is open.
- `--decide-only`: stop after the decision record; nothing is built, nothing is pushed.

The game: `index.html` (HTML, CSS, JS inline, no build step, no dependencies), custom
art in `art/*.webp`, a cache-first service worker in `sw.js`, and four Playwright tests in
`test/` driving the game through `window.__bps`. `CLAUDE.md` holds the rules every change
must follow, above all the learning rule (never show the answer while the child is
still trying; reveal it only after a failure). GitHub Pages serves `main`, so the push
to `main` at the end is the release.

## The shape of a run

```
1. Frame      read the game, write the state-of-the-game brief the debaters get
2. Debate     four debaters propose (round 1), then rebut and vote (round 2)
3. Decide     judge with the rubric, write the decision record
4. Build      one worktree, one builder subagent, one test
5. Verify     tests, screenshots, a learning-rule review of the diff
6. Release    cache bump, README, decision record, fast-forward main, push, artifact
7. Report
```

`<SKILL PATH>` below is this skill's directory (normally `<repo>/.claude/skills/feature-debate`);
resolve it to an absolute path once, because subagents run in other directories. The
test runner and the screenshot script are shared with the sibling skill:
`<repo>/.claude/skills/improve-game/scripts/run-tests.sh` and `shots.js`. If that skill
is gone, run the tests as `CLAUDE.md` describes.

Read the reference file for each phase when you reach it:
- `references/debate.md` - the four lenses, the two rounds, the proposal and ballot formats
- `references/decision-record.md` - the record you write and commit
- `references/builder-brief.md` - the brief the builder subagent gets; fill it in, do not improvise
- `references/release.md` - verification, release checklist, the artifact republish

## 1. Frame

Read all of `index.html`, `CLAUDE.md`, `README.md`, `sw.js`, every file in `test/`, and
the git log (`git log --oneline -30`). Read every file in `decisions/` if the directory
exists: those are previous debates, and an idea that lost one needs a new argument to
come back. Run the tests once (`run-tests.sh <repo> <out>`; skip with `--decide-only`);
if `main` is red on a clean checkout, fixing it is part of this run's release, not a
debate topic.

Then write the state-of-the-game brief to a scratch file (never in the repo). It is
what every debater reads first, so it has to let someone with no context argue well
in one sitting:

- what the game is and who it is for, in five lines;
- the three modes and three difficulties, what each already does, and what the
  celebration, sticker book and free play already reward;
- the learning rule and the other rules from `CLAUDE.md`, verbatim or nearly;
- the last ten commits in one line each, and every previous decision record's winner
  and rejected ideas in one line each;
- the focus, if the user gave one, and what it rules out;
- a map of the code: the fifteen or so functions a feature would touch, with line
  numbers (`onTap`, `update`, `spawnBubble`, `completeRound`, `revealAnswer`,
  `answerHtml`, `renderBook`, `setMode`, `startFree`, `save`/`load`, `toast`,
  `guideTalk`, `MODES`, `LANGS`, `__bps`), so a proposal can say what it costs;
- the art available in `art/` and the fact that new art has to go through the
  Higgsfield pipeline (a real cost a proposal must own up to).

Keep it under 150 lines. The debaters have tools and the repo path; the brief is
orientation, not a substitute for reading the code.

## 2. Debate

Follow `references/debate.md`. Four debaters, each with one lens: **the child** (fun,
surprise, collecting, coming back tomorrow), **the teacher** (what is learned, the
learning rule, the right difficulty for 4 to 8), **the parent** (calm, safe, offline,
no frustration, hand-the-phone-over-in-a-waiting-room), **the engineer** (one file,
no dependencies, buildable in one sitting with a Playwright test, merge and regression
risk). When the focus is narrow, add a fifth specialist lens (a language teacher for
"words mode", a maths teacher for "math mode").

Round 1: every debater reads the brief and the code and proposes two features in the
fixed format, then names the one it would fight for. Spawn all of them in one turn
with the Agent tool (general-purpose, background). Round 2: every debater gets every
proposal and writes a short support or objection for each one that is not its own,
may propose an amendment that merges two, and files a ranked ballot. Continue the same
agents with SendMessage (load it with ToolSearch if it is deferred) so they keep their
context; if that is not possible, spawn fresh agents with the whole round-1 transcript.

If no subagent tool is available to you at all, do not stall and do not ask: play
each lens yourself, one at a time, writing each debater's round to the scratch file
before starting the next so the seats stay distinct, and say so in the report. It is a
weaker debate than four independent agents, but a far better decision than one
brainstorm.

Two rounds is the whole debate. A third round rarely changes the ranking and doubles
the cost; if the top two are close, that is what the judge is for.

## 3. Decide

Score each surviving proposal 1 to 3 on five things: **child impact**, **learning
value**, **fit** with the game's promises (calm, no reading, no losing, offline, one
file, custom art), **buildable** in one sitting by one agent with a test, **low risk**
(touches few shared functions, does not change the save format unless that is the
point). A proposal that breaks the learning rule or the kids-first rules is out
regardless of score, and the record says so. The ballots inform; you decide. If you
override the vote, say why in the record; a judge who always follows the vote is not
needed, and one who never explains is not trusted.

Write the decision record from `references/decision-record.md`. It names the winner,
the acceptance criteria the builder will be held to, and every rejected proposal with
the argument that sank it, so the next debate starts further along. With
`--decide-only`, print the record in the final message, leave it in the scratch dir,
and stop here.

Decisions are final for the run. If the builder reports the feature is impossible as
specified, reshape it to the slice that is possible; do not reopen the debate.

## 4. Build

One worktree, one branch, one builder. The base is `main`, up to date with the remote.

```bash
REPO=$(git rev-parse --show-toplevel)
WT=$(dirname "$REPO")/$(basename "$REPO")-worktrees
git fetch origin main && git checkout -q main && git merge -q --ff-only origin/main
git worktree add -q "$WT/<slug>" -b "feature/<slug>" main
```

Spawn the builder with the Agent tool (general-purpose, background) and a prompt built
from `references/builder-brief.md`. The brief is self-contained: the builder has none
of your context and cannot ask. It gets the worktree path, the goal in the child's
terms, the acceptance criteria from the decision record, the relevant code with line
numbers, the learning rule, the test command, and the report format.

If the feature needs new art, make it while the builder works: generate it with the
Higgsfield tools in the house style (flat, friendly, thick outlines, transparent
background), cut it out, resize to 208px, save as `art/<name>.webp` in the worktree,
and tell the builder the file names up front so it can list them in `sw.js` and
`ART_SRC`. Prefer features that reuse existing art when the debate was close.

If no subagent tool is available, do not stall: build it yourself in the worktree
following the same brief, and say so in the report. While the builder works, draft the
README changes and reread the acceptance criteria so you can judge the report quickly.
The completion notice arrives on its own; if you are yourself a subagent, wait with a
short shell loop that checks the branch tip every minute or two instead.

## 5. Verify

Follow the verification half of `references/release.md`. In short: run the full suite
in the worktree yourself, run the new test five more times, take screenshots on the
three devices and read them (home screen must not scroll, nothing cramped on an
iPhone SE), then do the learning-rule review of the diff, which is the one review a
kids' learning game cannot skip. One fix round with the builder if needed; small
things you fix yourself. A feature that cannot be made green and rule-abiding in one
round is not shipped: record why, leave the branch, and release nothing.

## 6. Release

Follow the release half of `references/release.md`: bump `CACHE` in `sw.js` once, list
new assets, update `README.md`, commit the decision record under `decisions/`, refresh
screenshots if the look changed, run the tests twice more, then fast-forward `main`
and push it. `main` is always the target; that is the point of this skill. If the
harness assigned you another working branch, push the same commit there too so the
two agree. Republish the Claude artifact with the art inlined
(`scripts/inline-art.py`). Remove the worktree and the `feature/*` branch.

## 7. Report

The final message is the only thing the user reads. Lead with what shipped and where
it is playable. Then: the winner in one line, the vote and the deciding argument in
two, the runners-up and why they lost in one line each, how the feature was verified,
and the one thing the next debate should know. No question at the end.
