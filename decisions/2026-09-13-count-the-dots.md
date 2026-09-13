# Count the Dots: easy sums the child can count

Date: 2026-09-13   Focus: open   Debaters: child, teacher, parent, engineer

## Question
With three lives on every level, what one feature should be built next so that the game teaches more and stays fun for a
4-to-8-year-old, without anything on screen giving the answer away?

## Proposals
| # | Title | From | Size | Points | Supports / Objections |
| - | ----- | ---- | ---- | ------ | --------------------- |
| A | Count the Dots (merge of 2 "Count the Dots" and 5 "add-with-dots") | teacher, engineer | S | 9 | 4 / 0 |
| B | The One You Missed Comes First (merge of 1 "Ask Me Again" and 6) | teacher, engineer | S | 7 | 4 / 0 |
| 7 | Colour-Safe Rounds | parent | S | 6 | 2 / 1 |
| 3 | Lucky Star Bubble | child | M | 4 | 0 / 3 |
| 8 | Slower Bubbles After a Lost Level | parent | S | 2 | 1 / 2 |
| 4 | Poke the Owl | child | S | 0 | 3 / 0 |

Points: 3/2/1 for first/second/third on each of the four ballots, plus one for a round-1 "fight for". A cluster merge
adopted by two or more seats carries its members' points. No vetoes were filed.

## Decision
**Count the Dots** - In easy Math, a sum the child cannot yet do in the head is drawn under the equation as dots to count:
"3 + 2 = ?" shows three blue dots and two orange dots; "5 − 2 = ?" shows five dots with the last two faded. The child
counts with a finger, then finds the numeral among the bubbles. What is learned is counting-all and counting-on, the two
strategies children use before they know number bonds, and the match from a quantity to a numeral.

Why it won: it topped the vote (9 points, first on the engineer's ballot, second on the child's and the parent's, third
on the teacher's; every seat folded its own variant into it) and the judge follows the vote. The deciding argument was
the engineer's and the parent's together: a four-year-old who cannot read "3 + 2" loses three hearts on the add rounds
by tapping numerals at random, which since the three-lives change is a wall two rounds into Math; dots turn the guess
into thinking, as the accepted "Find 4" dots already do, and the change is DOM-only (no frame loop, save format or art),
so it lands green this run. The judge settles two points inside the cluster: dots are for easy only (three seats; hard
and expert keep the bare equation), and subtraction is included with faded dots (teacher and engineer: counting what is
left is the thinking, exactly as counting both groups is for addition). Missing-number and times tables get no dots.

Built as specified. Two things happened during the build: the builder fixed a pre-existing frame-loop bug it hit while
testing (a just-spawned target bubble, at y = H + r + 8, was not counted as visible, so a new question with no answer on
screen force-spawned a target every frame up to the cap; now at most `minT` are forced), and test/lives.js judges a
bubble right or wrong by its number or word against the question rather than by the target flag, which lags a pop by a
frame; `noGiveaway()` is unchanged. The free-play three-tries reveal shares the same `answerHtml()` path but is not
driven by the test, because free play needs all ten rounds unlocked (see "For next time"). At release the math test
flaked once on a pre-existing 3% case (round 1 dealt the same "Find n" three times in four); the game now never asks the
same question twice in a row, which is also what a child expects.

Acceptance criteria (the builder is held to these):
- In easy difficulty, Math mode (rounds and free play alike), when the current question is an addition with a + b <= 10,
  the owl's bubble shows the equation text as today ("3 + 2 = ?") and, in the icons row, a `.dots` group of a + b dots:
  the first a dots in the usual blue, the next b dots in a second colour (class `b`, orange), in place of the "?" bubble.
  `state().problem` exposes `a` and `b`.
- In easy difficulty, when the current question is a subtraction with a <= 10, the icons row shows a dots with the
  last b of them faded (class `gone`), in place of the "?" bubble.
- Missing-number ("3 + ? = 7") and multiplication questions, and any sum over 10, keep today's "?" bubble. "Find n" keeps
  today's dots. Hard and expert never show sum dots. The Animals and Words modes are untouched.
- The layout holds: at most two rows of dots (10 dots), no taller than the existing "Find 10" bubble, so the HUD does not
  push into the play area on an iPhone SE; nothing scrolls.
- Learning rule: the dots draw the question, never the answer: the "?" stays in the text, no dot is marked as the result,
  nothing appears after a delay, no bubble glows. On a failure the reveal goes through `answerHtml()` and shows the same
  dots plus the result ("3 + 2 = 5" with the answer bubble), as today's reveal does for other questions.
- Test: test/math.js gains checks that easy round 3 shows `.dots i` count == a + b with `.dots i.b` count == b and no digit
  in any `.q`; easy round 5 shows a dots with `.gone` count == b; hard round 3 shows no `.dots`; and that the reveal after
  three hearts (or the free-play three tries) shows the result. test/lives.js `noGiveaway` keeps passing unchanged.

## Rejected and deferred
- **The One You Missed Comes First (1+6)** - deferred: every seat supports it (retrieval right after the reveal); it lost
  on buildability this run (its test needs lost rounds and 5 s waits, and free play must be reachable in a test). Build
  it next, in memory only, Math and Words, cleared on mode/difficulty/language change but not in goHome (the teacher's
  catch: loseRound goes home before Play sees it).
- **Colour-Safe Rounds** - deferred: the parent's fairness point stands (about one boy in twelve cannot separate green
  from orange, and a wrong tap now costs a heart), and the engineer confirmed it drops into the distractor loop; the
  teacher's objection that red-versus-orange is itself the colour lesson means it should return as a per-child setting
  or as a shape-per-colour aid, not a global table.
- **Lucky Star Bubble** - rejected: the teacher (a tap on what shines, the opposite of "read the owl, then choose"), the
  parent (confetti in a waiting room, a second score to chase, a save-format change) and the engineer (it breaks every
  test's wrong-bubble picker; honest size M) all objected.
- **Slower Bubbles After a Lost Level** - rejected: the engineer showed a hidden speed multiplier lets a 3-star expert
  round be earned at 70% speed while the sticker book says "Perfect!"; the child would not feel it. Acceptable only
  cut to easy, where it is barely observable.
- **Poke the Owl** - deferred: harmless and liked by three seats as a "say it again" for a child who looked away, but no
  seat ranked it; a filler for a run with a small remaining budget.

## For next time
Build "The One You Missed Comes First" (in-memory redo of the failed question, Math and Words, free play two questions
later); its test needs a `__bps.unlockAll()` helper so free play is reachable. Then look at Colour-Safe Rounds as a setting.
