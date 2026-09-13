# Three hearts on every level: in easy, a heart is a lost question, not a slip

Date: 2026-09-13   Focus: "Tu as 3 vies pour completer chaque niveau; si tu te trompes 3 fois c'est dead"   Debaters: child, teacher, parent, engineer, game designer

## Question
How should every level, easy included, be played with three lives (three mistakes and the level is lost) so that a
4-to-8-year-old still has fun, still learns, and the game keeps its no-game-over, never-punish rules?

## Proposals
| # | Title | From | Size | Points | Supports / Objections |
| - | ----- | ---- | ---- | ------ | --------------------- |
| B | A heart is a lost question (merge of 3 "A heart is a lesson, not a slip", 5 "easy hearts per question", 10 "A lost question costs a life") | teacher, parent, engineer | M | 10 | 4 / 2 |
| D | A calm card at zero hearts (merge of 2 "Owl's Oops Card", 6 "Try-again card", 8 "Owl's Retry Card") | child, parent, designer | M-L | 6 | 4 / 1 |
| 9 | Hearts on every level (a heart per wrong tap, easy included) | engineer | S | 6 | 1 / 3 |
| 7 | Hearts That Heal (a right pop in easy re-lights a heart) | designer | S | 5 | 1 / 1 |
| 1 | Three Hearts for Everybody (heart back after three right in a row, easy stars by mistakes) | child | M (engineer: L) | 4 | 0 / 2 |
| 4 | Three taps, then the lesson (soft death in easy keeps the bar, easy stars by mistakes) | teacher | M | 4 | 1 / 2, vetoed |

Points: 3/2/1 for a first/second/third place on each of the five ballots, plus one for a round-1 "fight for". A cluster
merge adopted by two or more seats carries its members' points.

## Decision
**Three hearts on every level; in easy, a heart is a lost question, not a slip** - Every round in every mode and
difficulty now shows three hearts. In hard and expert nothing changes (a wrong tap, a bomb or a timeout costs a heart).
In easy a heart goes out at the moment the owl has to show the answer: the third wrong tap on the same question in
Math and Words, or the third wrong tap since the last right pop in Animals. Three hearts gone and the level is "dead":
the owl shows the answer once, every bubble pops, the bar empties, the hearts refill and the same level starts again.

Why it won: it topped the vote (10 points, first on the teacher's and the parent's ballots, second on the engineer's)
and the judge follows the vote. The teacher's argument carried: tying the life to the reveal makes three lives three
lessons ("a heart goes when the owl shows you the answer"), which is the only version where a lost heart teaches
something and a 4-year-old is never killed by a slip of the finger on a moving bubble. The parent's line on permanence
is adopted: hearts grey and refill within a level, but nothing is recorded (easy stars stay 3, the star row stays
hidden), so the vetoed "visible loss on the home screen" never appears. The judge settles the one open point inside
the cluster, Animals in easy, for the teacher and parent (third wrong tap since the last right pop) over the engineer
and designer (per tap): one rule a non-reader can feel in every mode, "three wiggles, one heart", beats a faster loop.
The engineer's ordering fix is a criterion: when the lost heart is the last one, loseRound owns the single reveal.

Built as decided, with one reshaping during the build: a lost round in hard or expert Animals still restarts at once
(no reveal), because test/hard.js asserts the immediate restart and the criteria required it to pass unmodified; in
easy Animals a lost question and a lost round both show the goal with the matching bubbles glowing.

Acceptance criteria (the builder is held to these):
- In every mode (Animals, Math, Words) and every difficulty, a round starts with `state().hearts===3` and the HUD shows
  three hearts (`#hearts .hp` x3, `#row2` displayed). Free play keeps no hearts and its per-question reveal, unchanged.
- Hard and expert behave exactly as today; test/hard.js passes without modification.
- Easy Math and Words: the first and second wrong tap on a question wiggle the bubble and toast "Oops!", cost no heart
  and reveal nothing. The third wrong tap on the same question toasts "Look!", reveals the answer through
  `revealAnswer()`/`answerHtml()` (answer shown, right bubbles glow, taps ignored ~2.4 s), costs one heart, and is
  followed by a new question with the bar (progress) kept.
- Easy Animals: the same rule where "the same question" is the current goal since the last right pop: a right pop
  resets the strike count; the third wrong tap since the last right pop costs a heart and reveals: `answerHtml()` gains
  an Animals branch (the goal text and the big goal bubble, as `renderGoal()` draws them) so the matching bubbles glow
  for ~2.4 s with "Look!", then play continues with the bar kept.
- When the heart lost is the last one, `loseRound()` owns the moment: exactly one reveal (2.6 s, the answer shown), then
  every bubble pops, progress 0, hearts 3, "Try again!", the same round; never two overlapping `revealAnswer()` calls,
  hearts never stick at 0, and nothing is recorded.
- `starsFor()` still returns 3 in easy, the sticker book still hides the star row in easy, the save format is untouched.
- An accidental Home tap still resumes with the same hearts.
- Test: test/lives.js (new, all three modes, easy) checks: hearts 3 at start and visible; Math: two wrong taps leave
  hearts 3 and no reveal, the third gives reveal + hearts 2 + a new question + progress kept; Animals: a right pop
  resets the strike count (two wrong, one right, two wrong: still 3 hearts), the third wrong since the last right pop
  costs a heart with glowing targets; Words: losing all three hearts gives a single reveal then hearts 3 / progress 0 /
  same round / `best` unchanged; no answer on screen during play. test/smoke.js updated (hearts visible in easy; the
  first wrong taps cost no progress); test/math.js and test/words.js keep passing (they may gain hearts assertions).

## Rejected and deferred
- **A calm card at zero hearts (2+6+8)** - deferred: four seats want it as the next slice (a still screen the child
  can read, safari gets a reveal, auto-restart), but the engineer showed it breaks test/hard.js step 4 and the 6 s
  restart waits and adds a screen state; it is a follow-up after this run settles what costs a life.
- **Hearts on every level (per tap in easy)** - rejected: the child, the teacher and the parent all called it the
  vetoed flame in disguise: three slips on moving bubbles empty a 4-year-old's whole bar, and not knowing one word at
  4/5 costs the bar where today it costs nothing. Its fast loop is the designer's one good argument; hard/expert keep it.
- **Hearts That Heal** - deferred: the teacher's objection (a random tapper heals every time and never meets an answer,
  while the child who does not know one sum loses the bar) and the engineer's warning (death becomes today's rule in
  new clothes) sink it as written; a heal on a right pop could still be added on top of this run's rule later.
- **Three Hearts for Everybody** - rejected: the engineer sized it L (hearts + streak counter + flying heart + easy
  stars) and the teacher showed the heart-back rewards easy pops, not correcting the missed thing.
- **Three taps, then the lesson (soft death)** - vetoed by the parent: a single slip costs a life in easy and a death
  writes 1 star into the sticker book for good. The judge agrees; the designer adds it is the worst ordering of loss.
- **"Easy earns 1-3 stars by mistakes"** (clause in 1, 2, 3, 8) - vetoed by the parent: a recorded, visible "you
  lost" on the home screen. Adopted; easy stars stay 3 in the winner.

## For next time
The calm card at zero hearts (the reveal on a still screen, hearts refilling one by one, tap or auto-restart) is the
runner-up every seat but the engineer wants; it is an S-to-M slice now that the per-question rule exists, if its test
budget (hard.js step 4, the 6 s waits) is planned for.

## Revised the same day, by the owner
After the release the owner asked for the literal rule ("if you miss three times you're dead and lose a life"): in easy
too, every wrong tap costs a heart and the third miss loses the round. Shipped as asked: the three-tap grace per question
in easy is gone (free play, which has no hearts, keeps the three-tries reveal). A lost easy Animals round still shows the
goal with the right bubbles glowing before the restart; hard and expert are unchanged; easy still records no stars. The
parent's and teacher's objections to a heart per tap in easy stand in the record above as the risk to watch for.

## Revised again the same day, by the owner: the third miss fails the level
The round no longer restarts in place. After the reveal the game goes back to the home screen ("Try again!"), the
failed attempt is not resumed, and Play starts the same level again from zero with three hearts. Stickers already
earned are untouched and nothing about the failure is recorded, so it is a lost level, not a game over.
