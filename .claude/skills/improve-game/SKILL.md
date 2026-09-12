---
name: improve-game
description: Autonomously improve Bubble Pop Safari (this repo's kids' mobile web game) end to end - analyze the whole game, decide what to fix or add, hand each item to a parallel subagent working in its own git worktree, merge every result into main, and push. Use this whenever the user asks to improve, upgrade, polish, "make better", add features to, or "level up" the game, asks for ideas plus implementation, or says something like "look at the game and do what you think is best", even if they do not mention subagents or merging. Also use it when the user asks for a batch of improvements in one go, or for a focused pass ("improve the math mode", "make it more fun for 4 year olds"). Do not use for a single, already-specified change - just make that change directly.
---

# Improve the game

You are the lead engineer for this run. The user has delegated every decision to you:
what to improve, how many things, how to build them, how to resolve conflicts, and when
it is good enough to ship. Do not ask the user questions. Make the call, write it down,
move on. A run that ends in a question the user has to answer is a failed run; a run that
made a reasonable choice the user might have made differently is a success.

Arguments (both optional): `/improve-game [count] [focus...]`
- `count`: how many improvements to build this run. Default 4. Fewer if the codebase or
  the focus does not support that many independent items well.
- `focus`: free text narrowing the analysis ("math mode", "sound", "younger kids", "bugs
  only"). Without a focus, look at everything.

The game: one file, `index.html` (HTML, CSS and JS inline, no build step, no dependencies),
custom art in `art/*.webp`, a cache-first service worker in `sw.js`, a PWA manifest, and
three Playwright tests in `test/` that drive the game through the `window.__bps` hook.
GitHub Pages serves `main` directly, so pushing to `main` is the release.

## The shape of a run

```
1. Analyze      read everything, run the tests, look at screenshots, write findings
2. Decide       score the findings, pick `count` independent items, write the plan
3. Delegate     one worktree + one subagent per item, all launched in the same turn
4. Integrate    merge each branch into an integration branch, test after every merge
5. Release      bump the service worker cache, update README, merge to main, push
6. Report       what shipped, what was dropped and why, what to do next time
```

This skill's directory (the one holding this file, normally `<repo>/.claude/skills/improve-game`)
is `<SKILL PATH>` below; resolve it to an absolute path once and use that everywhere,
because subagents run in other directories.

Each phase has a reference file with the detail. Read it when you reach that phase:
- `references/analysis.md` - what to look for and how to write findings that lead to good picks
- `references/subagent-prompt.md` - the brief every subagent gets; fill it in, do not improvise
- `references/integration.md` - merge order, conflict rules, release checklist

## 1. Analyze

Read the whole of `index.html`, `README.md`, `sw.js`, `manifest.webmanifest`, and every
file in `test/`. Skim `PROMPT.md` for the original intent (kids 4 to 8, no reading
required, no losing, no network). Read the git log to see what recent runs already did,
so you build on them rather than repeat them.

Then establish the baseline with the bundled scripts (paths are relative to this skill):

```bash
<SKILL PATH>/scripts/run-tests.sh <repo> <out-dir>          # all tests; must be green before you start
NODE_PATH=$(npm root -g) node <SKILL PATH>/scripts/shots.js http://127.0.0.1:<port> <out-dir>   # phone screenshots
```

`shots.js` needs a server; `python3 -m http.server <port>` from the repo root is enough.
Look at the screenshots with the Read tool. A lot of what is wrong with a kids' game is
only visible: cramped layouts on an iPhone SE, text a 4-year-old cannot parse, a button
that is too close to another one. If the tests are red on a clean checkout, fixing that is
item one and it is not optional.

Follow `references/analysis.md` while you look. Write findings to a scratch file (not the
repo) as a list: what, where (`index.html:line`), who it hurts, how big the fix is.
Aim for 10 to 20 findings before you pick. A short list means you looked too narrowly.

## 2. Decide

Score every finding on four things, each 1 to 3:
- **impact**: does a child or parent notice? Bugs and frustration beat novelty.
- **fit**: does it match the game's promise (calm, no reading, no losing, offline, one file)?
- **size**: can one subagent finish it, with a test, in one sitting? Big ideas get cut down
  to the slice that fits, or dropped.
- **independence**: does it live in its own region of `index.html`? Two items that both
  rewrite `onTap` or `update` will fight at merge time. Prefer items that touch different
  functions, or one item that touches the shared core and others that do not.

Pick the top `count` by score, then sanity-check the set as a whole: a mix of at least one
fix or polish item and at least one thing a child would call new is usually the best
run. If a focus was given, everything picked serves it. Write the plan to your scratch
file: each item gets a slug (`improve/<slug>` is its branch), a one-paragraph goal, the
acceptance criteria, the files and functions it may touch, and which test proves it.

Decisions you make here are final. Do not reopen them because a subagent pushes back;
if an item turns out to be impossible as specified, the subagent reports that and you
drop or reshape it in integration.

## 3. Delegate

Create one worktree per item, from the up-to-date base branch, before spawning anyone.
The base is `main` (fetch it first if there is a remote) unless the environment restricts
you to another branch, in which case that branch is the base and the merge target.

```bash
BASE=main
REPO=$(git rev-parse --show-toplevel)
WT=$(dirname "$REPO")/$(basename "$REPO")-worktrees      # sibling of the repo, one dir per item
git fetch origin $BASE 2>/dev/null && git checkout -q $BASE && git merge -q --ff-only origin/$BASE
for slug in <slugs>; do
  git worktree add -q "$WT/$slug" -b "improve/$slug" "$BASE"
done
```

The worktrees sit next to the repo rather than inside it so git never sees them as
untracked files, and next to it rather than in a shared temp dir so two runs on two
checkouts never collide.

Spawn all subagents in one turn with the Agent tool (general-purpose type, run in the
background), one per item, each with a prompt built from `references/subagent-prompt.md`.
The prompt has to be self-contained: the subagent has none of your context. Give it the
absolute path of its worktree, the goal, the acceptance criteria, the constraints, the
test command, and the report format. Tell it to decide on its own and never to ask.

While they run, prepare the integration branch and the README changes you already know
about, and re-read the plan so you can judge the reports quickly. The completion notice
for each subagent arrives on its own; you do not need to poll for it. One exception: if
you are yourself running as a subagent (someone delegated this whole skill to you),
ending your turn ends you, so instead wait with a short shell loop that checks the tip
of each `improve/*` branch every minute or two and returns when all have moved or a
generous deadline passes. A subagent that never commits gets its worktree inspected,
per `references/integration.md`.

## 4. Integrate

Follow `references/integration.md`. In short: an integration branch from the base, merge
the subagent branches one at a time (smallest and lowest-risk first), run the full test
suite after each merge, and resolve conflicts yourself by understanding both sides.
Both sides were things you decided to want, so a conflict is a merge problem, not a
choice between them. A branch whose tests fail after a fair repair attempt gets dropped
with a note, not shipped broken. Never disable a test to get to green.

## 5. Release

Once every accepted branch is in and green:
- bump the `CACHE` constant in `sw.js` exactly once for the run (every change to the game
  files needs it, or installed phones keep the old version), and add any new asset paths
  to its `FILES` list;
- update `README.md` so the feature descriptions and the Files table are true again;
- run the tests one last time and refresh the screenshots in `screenshots/` if the look
  changed;
- merge the integration branch into the base with a fast-forward, push it, and delete
  the `improve/*` branches and worktrees.

If pushing is refused, say so in the report with the branch name that holds the work.

## 6. Report

The final message is the only thing the user reads. Lead with what shipped and where it
is playable. Then one line per item: what it does for the child, and how it was verified.
Then what was dropped and why, in one sentence each. Then the two or three findings you
did not get to, so the next run can start from them. No question at the end.
