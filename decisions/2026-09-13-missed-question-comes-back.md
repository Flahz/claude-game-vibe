# The One You Missed Comes Back

Date: 2026-09-13   Focus: open   Debaters: child, teacher, parent, engineer

## Question
After Count the Dots shipped, what one feature should be built next so the game teaches more and stays fun for a
4-to-8-year-old, without anything on screen giving the answer away?

## Proposals
| # | Title | From | Size | Points | Supports / Objections |
| - | ----- | ---- | ---- | ------ | --------------------- |
| A | The One You Missed Comes Back (merge of 5 "comes first" and 7 "comes back") | engineer, teacher | M | 12 | 4 / 0 |
| B | A mark per colour (merge of 3 "Every Colour Has a Mark" and 6 "Colour Shapes") | parent, engineer | M | 7 | 3 / 1 + veto |
| 2 | Eggs in the Sticker Book | child | M | 4 | 1 / 2 |
| 1 | Pop-Pop-Pop Finale | child | S | 2 | 3 / 0 |
| 8 | Times Tables You Can Count | teacher | S | 2 | 2 / 1 |
| 4 | Still Sky (reduced motion) | parent | S | 1 | 2 / 1 |

Points: 3/2/1 for first/second/third on each of the four ballots, plus one for a round-1 "fight for". A cluster merge
adopted by two or more seats carries its members' points. Cluster A was merged by all four seats; cluster B by all four,
but they split on always-on (parent, engineer, child) versus opt-in (teacher), and the teacher vetoed the always-on form.

## Decision
**The One You Missed Comes Back** - When the owl has to show the answer ("GRENOUILLE is the frog", "3 + 2 = 5"), that
exact question comes back soon, unmarked: it is the owl's first question when Play restarts the lost level, and in free
play it returns as the second question after the reveal. The child gets to prove they remember it seconds after the
correction, which is where a word or a number fact actually sticks.

Why it won: it took 12 points, first on the teacher's and the engineer's ballots and second on the child's and the
parent's, with four amendments merging the two versions and no objection from any seat. The deciding argument was the
teacher's: the game spent two debates building a reveal, and today that reveal is a picture the child glances at before
a fresh random question arrives, so a missed sum is one draw among about forty-five and almost never comes back. This
turns the reveal into a question the child answers. The engineer removed the reason it was deferred last time: the level
version needs no free play and no new waits because test/math.js already loses a level and restarts it, and the
free-play half is 32 lines that already exist on branch feature/come-back-question plus a one-line unlockAll() helper.
The parent's condition is part of the feature: the returning question is unmarked, so a child who just lost is quietly
given a chance rather than reminded that they failed.

Built as specified, both halves in one sitting. The free-play half was lifted from the abandoned branch
feature/come-back-question and reworked: its clear in `goHome()` was what made a level version impossible, so the clears
moved to `setMode` / `setDifficulty` / `setLanguage` / `completeRound` / `resetProgress`, and `beginPlay` drops the
memory on a resumed start or a different round. One slot, not a queue, so a second miss in free play replaces the first.
The new test flaked once in five on a crowded free-play screen where no unobstructed wrong bubble had risen into view
before the retry budget ran out; its bubble-picking waits are now time-based rather than counted, no assertion weakened,
and it passed eight times in a row afterwards.

Acceptance criteria (the builder is held to these):
- Losing a level in Math or Words (three hearts gone, the owl reveals the answer, back to the home screen) remembers
  that question in memory only, never saved. When Play starts that same level again (same mode, difficulty, language
  and round, a fresh start rather than a resume), the owl's first question is the missed one.
- The returning question is unmarked: `renderGoal()` renders it exactly as any other question, no picture, no English,
  no glow, no toast, nothing that says it is a repeat. It is asked once; if it is missed again it is not queued twice.
- The memory is cleared when the child changes mode, difficulty or language, when the round is completed, and on
  `resetProgress()`. It survives `goHome()`, which is the whole point.
- In free play (no hearts), three wrong tries on one question reveal the answer, then one fresh question is asked, then
  the missed one returns once, unmarked.
- `state()` exposes the queued question (its text for Math, its key for Words) and `__bps.unlockAll()` is added so a
  test can reach free play.
- Learning rule: nothing changes about when the answer is shown. The reveal still happens only after a failure, through
  `revealAnswer()` / `answerHtml()`; the returning question shows no more than any other question does.
- Test: test/math.js and test/words.js gain the level version (lose a level, restart it, assert the first question is
  the missed one, and that changing difficulty or language clears it); test/comeback.js covers the free-play version
  through `unlockAll()`.

## Rejected and deferred
- **A mark per colour (3 + 6)** - deferred, and the always-on form vetoed by the teacher: a mark on every coloured
  bubble that also sits on the owl's goal swatch is a name tag matching the question, so the colour rounds become
  shape-matching and stop teaching red from orange. The judge upholds the veto for the always-on form and keeps the
  parent's problem open: a wrong tap now costs a heart on every level, so a child who cannot separate green from orange
  is charged a life for his eyes. The surviving path is the engineer's opt-in version (a button, off by default, saved
  in bps.v3, marks only on coloured bubbles, never on the Words "?" bubble) which the teacher accepts. The parent's
  objection to opt-in stands and is worth answering next time: under-8s are rarely diagnosed, so no parent knows to
  turn it on.
- **Eggs in the Sticker Book** - rejected: the teacher (attention moves to what hatches rather than what the child did,
  and 0.7 s more before the next round) and the engineer (the most expensive item on the list, one new art file plus a
  second image in every book slot, for zero learning).
- **Pop-Pop-Pop Finale** - deferred: three seats support it and nobody objects, but it is pure celebration and it lost
  to two learning features. Cheap to build later; the engineer's shape is to stretch `doneIn` and burst through
  `addPop`, skipping free play.
- **Times Tables You Can Count** - deferred: the engineer showed `hudB` is measured only in `beginPlay` and `resize`,
  so a 5-row grid growing the pill mid-round leaves the culling height stale and every test's visibility check wrong.
  It comes back with one `measureHud()` at the end of `renderGoal()` and a row cap.
- **Still Sky** - deferred: cheapest test on the list and nothing can go wrong for the merge, but the child objected
  that it removes the shake and the confetti, and it teaches nothing. A good filler for a small-budget run.

Left alone deliberately, found by the builder: in free play only, words questions alternate between picture and reverse
kinds while bubbles outlive a question, so a bubble spawned under a reverse question can still wear its word when the
next question is a picture one. It predates this branch and refreshing bubble text per frame risks the 40fps budget;
test/comeback.js documents it and scopes its "a picture bubble never wears its word" check to the level rounds, where
test/words.js still enforces it. A targeted fix (refresh `b.word` in `nextQuestion`) is a good small future item.

## For next time
Build the opt-in colour marks (the engineer's version 6, which the teacher accepts), or answer the parent's objection
that an opt-in helps nobody because under-8s are rarely diagnosed. Pop-Pop-Pop Finale is the cheap celebration to pair
with a small run.
