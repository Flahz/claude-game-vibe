# Patterns mode: what comes next

Date: 2026-09-13   Subject asked for: patterns (user picked it from the catalog)   Id: `patterns`   Icon: art/patterns.webp

## What it teaches, and for whom
Spotting a rule in a row of things and carrying it on. At round 1 a four-year-old sees five
coloured bubbles, red blue red blue red, then a "?", and pops the blue one; no reading, no
counting, just noticing that it goes round again. By round 9 an eight-year-old sees 90 80 70
and has to pop 60, which is counting backwards in tens. In between the period gets longer
(ABC, then the uneven AAB) and the numbers start stepping by two, three, five and ten.
It is not a re-skin: Animals asks what a bubble IS, Math asks what a sum MAKES, Words asks
what a foreign word MEANS. Patterns asks what comes NEXT, which is the one thing none of
them ask, and it is the root of both times tables and reading rhythm.

## The ladder
Repeating rounds show five items then a "?" (four in expert: less evidence, harder). Number
rounds always show three then a "?". `pool` is how many distinct colours or animals the round
draws from, so the extra ones are distractors. Five right pops earn the sticker.

| Round | Kind | Easy asks | Hard asks | Expert asks | Wrong bubbles are |
| ----- | ---- | --------- | --------- | ----------- | ----------------- |
| 1 | `ab` colours | red blue red blue red ? (pool 3) | pool 5 | 4 shown, pool 7 (red/orange/pink together) | the pattern's other colour first, then the pool |
| 2 | `ab` animals | lion frog lion frog lion ? (pool 3) | pool 5 | 4 shown, pool 8 | the other animal in the pattern, then the pool |
| 3 | `abc` colours | red blue yellow red blue ? (pool 4) | pool 6 | 4 shown, pool 7 | the two other members, then the pool |
| 4 | `abc` animals | pool 4 | pool 6 | 4 shown, pool 10 | as above |
| 5 | `count` up | 3 4 5 ? step 1, to 10 | step 2, to 24 | step 5, to 60 | one step short and one step long, then near numbers |
| 6 | `count` up | 4 6 8 ? step 2, to 20 | step 3, to 40 | step 10, to 120 | as above |
| 7 | `aab` colours | red red blue red red ? (pool 4) | pool 6 | 4 shown, pool 7 | the other member, then the pool |
| 8 | `aab` animals | pool 4 | pool 6 | 4 shown, pool 10 | as above |
| 9 | `back` down | 9 8 7 ? step 1 | 24 22 20 ? step 2 | 90 80 70 ? step 10 | one step either side, then near numbers |
| 10 | `mix` | any of the five kinds, round-10 pools | | | as that kind's rule |
| free | `mix` | endless, no hearts | | | |

## The bubble
- Target carries: the answer. A colour question gives a plain colour bubble (`color`), an
  animal question an animal on a random colour (`animal`), a number question a number (`num`).
  Every pattern bubble also carries `pkey`, the answer value as a string, which is what
  `isTargetNow` compares against `prob.key`.
- Wrong carries: `wrongPat()`. First choice is another member of the pattern itself, because
  carrying on without noticing the period is the mistake a child actually makes. For numbers
  it is one step short or one step long, then a neighbour. It never returns the answer and
  prefers a value not already on a bubble, like `wrongNum`.
- Drawn: nothing new. A plain colour bubble already draws with no sprite, an animal bubble
  already draws its sprite, a number bubble already draws its label. No canvas code is added,
  so the expert frame rate cannot move.
- Bombs: hard and expert, on wrong bubbles, the same roll as the other modes.

## The owl
| Kind | Text (`goalText`) | Icons (`renderGoal`) | What a non-reader gets |
| ---- | ----------------- | -------------------- | ---------------------- |
| all | "What comes next?" | the pointing hand, then the sequence as small 34px bubbles ending in a rainbow "?" bubble | the whole question: a row of things and an obvious gap at the end |

The row reuses the ordered-goal `.seq` styling with a `.pat` variant at 34px and a 4px gap.
Six slots at most (five shown plus the "?"), which is 224px, inside the 255px the speech
bubble has on an iPhone SE; it wraps rather than overflowing if a font is wider than expected.
One row of 34px bubbles is shorter than "Find 10" with its two rows of dots, so the play area
does not move.

## The reveal (`answerHtml`)
| Kind | Shows |
| ---- | ----- |
| all | the same row with the answer in the last slot instead of the "?", ringed in gold so the child sees which one it was, under the same "What comes next?" |

## Learning-rule check
| Kind | What could give the answer away | Why it does not |
| ---- | ------------------------------- | --------------- |
| `ab`, `abc`, `aab` | the answer's value is visible in the prompt, because a repeating pattern is made of its own members | That is the task, not a leak: the child must work out WHICH member comes next. Nothing marks it, and the wrong bubbles are the other members, so copying any visible item is a coin flip. |
| `count`, `back` | the step is visible | The child must extend it. The answer number appears nowhere on screen before the reveal. |
| all | the "?" slot | Stays a bare "?" until `revealAnswer`; nothing fills it after a delay. |
| all | a glowing bubble | Glow is set only by `revealAnswer`, and `nextQuestion` clears it. |
| all | the float after a right pop | Celebration of what was just popped (rule 3), never the next answer. |

## Art
Icon only: `art/patterns.webp`, 208px. Higgsfield, "a single flat cartoon icon of three round
beads in a row, red then blue then red, thick dark outline, bright colours, no text, centered,
plain white background", cut out with `scripts/cutout.py`. If Higgsfield is unavailable or the
result is off-style after two tries, draw three flat circles (red, blue, red) with a script in
the game's own bubble style. No content art: colours, animals and numbers are already drawn.

## Test plan
`test/patterns.js` from the template: easy rounds 1, 3, 5, 7 and 9 (one per kind) checking the
owl shows the sequence and a bare "?" with no digit and no glow, that `state().problem` exposes
`kind`, `type`, `seq` and `key`, and that the popped bubble is the one whose `pkey` matches;
that a wrong tap costs a heart and three lose the level with the reveal showing the answer in
the last slot; round 10 mixes kinds; hard round 1 has bombs and no ordered goal; one expert
round; and that patterns progress is separate from the other three modes. `test/lives.js`
gains patterns in `isRight` (compare `pkey`) and `noGiveaway` (the `.q` reads "?", no glow).

## Changes during the build
- **No pointing hand in the owl's bubble for this mode.** Every other mode prefixes the icons row with the pointing
  hand, which is 58px wide. With it, a six-slot row had 215px on a Pixel 5 and wrapped onto a second line. The row IS
  the question here (a line of things and an obvious gap), so the hand was clutter as well as expensive, and dropping
  it leaves the owl's pill shorter than any other mode's.
- **The row shrinks to 29px slots below 380px.** The smallest phone the game supports is 320px wide, which leaves the
  speech bubble 212px inside; six 34px slots need 224. The narrow-phone rule keeps every row on one line, and
  `test/patterns.js` now ends with a check on a 320px viewport that fails if any round's row wraps or the pill grows.
- **One `quiz` flag for the three question modes.** `cur.math||cur.words` had grown into six places; the mode adds a
  third question mode, so those sites now test `cur.quiz` and `mathRound`, `MATH_FREE`, `wordRound` and `WORDS_FREE`
  carry the flag. Patterns inherits the come-back rule shipped earlier today for free, which the test asserts.
- **A words bug fell out of that.** `buildSeq` excluded only `cur.math`, so from round 5 in hard and expert it built an
  ordered goal for words too. Nothing rendered it, but `beginPlay` adds `seq.length-1` to the goal, so those rounds
  quietly asked for six right pops instead of five. Question modes are now excluded as a class and words rounds are
  five pops at every difficulty, as they always read.
- **Four buttons do not fit one line with their labels.** Below 430px the game buttons show their icons only. That is
  how the home screen stays unscrolled with a fourth mode; in this container it also fixes an overflow that `main`
  already had on an iPhone SE and an iPhone 12 Pro.
- **The learning-rule review caught a real giveaway, now fixed.** With four items shown, an `aab` row is A A B A and the
  next item is A, which is exactly the item the row ends on: at expert, rounds 7, 8 and the `aab` draw of round 10 could
  be won every single time by popping whatever matched the last slot, without ever seeing that there is a period. That
  also made expert easier than easy for that kind, which the rules forbid. `newPattern` now lengthens the row by one
  whenever the next item would repeat the last one, so the answer always sits a period back; 12,000 sampled rows across
  all ten rounds and all three difficulties now show none where the answer is the last item, none negative, and never
  more than six slots. `test/patterns.js` asserts the invariant on every repeating row, so a future table edit cannot
  bring it back. Expert `aab` therefore shows five items like easy and hard, and takes its extra difficulty from the
  wider pool of look-alike colours and animals instead.
- The icon was drawn with the documented PIL fallback, not Higgsfield: `generate_image` refuses on this account's free
  plan. Three beads, red blue red, in the house style; it reads as three separate beads at 34px.
