# Subjects worth a mode

Take them in order when no subject is given (the first whose id is not in `MODES`), or
use the closest one as the shape for a subject the user named. Each entry says what is
learned, how the ten rounds climb from a four-year-old to an eight-year-old, what the
bubbles carry, and the trap that breaks the learning rule for that subject. "Harder" here
means the top rounds and expert stretch a seven- or eight-year-old; the bottom rounds in
easy are still playable without reading.

Rejected shapes, so they are not proposed again: another language (a Words setting),
bigger numbers or another operation (a Math round, use improve-game), anything that
needs a voice, anything that needs reading in round 1 of easy.

## 1. Letters (`letters`) - the alphabet and first sounds

Learns: recognising letters, upper and lower case, the sound a word starts with,
alphabet order. Bubbles carry one letter each (a text label drawn like the numbers).

| Rounds | Kind | Easy | Hard | Expert | Wrong bubbles |
| ------ | ---- | ---- | ---- | ------ | ------------- |
| 1-2 | `find` | Owl shows a big letter, bubbles carry the same case; A-F, then A-M | bubbles in lower case, prompt in upper | mixed case, whole alphabet | letters that look alike (B/D/P/R, M/N/W, I/L/T, C/G/O/Q) |
| 3-5 | `sound` | Owl shows an animal picture (the ten stickers), the answer is its first letter; 4 choices | 6 choices, lower case | colours too (R for red, in its colour) | letters of the other animals on screen, then look-alikes |
| 6-7 | `next` | "A B ?" three in a row, the next one | "? C D", the one before | every other letter ("A C ?") | the neighbours (E, F for "A B ?") |
| 8-9 | `first` | Two animals in the prompt, "which letter comes first in the alphabet" | three | letters only, no pictures | the other candidates |
| 10, free | `mix` | | | | |

Owl: `find` shows the letter big in the text; `sound` shows the animal in a goal bubble
and the text "?" (or "Starts with ?") - never the animal's name, which contains the letter;
`next` shows "A B ?" as text. Reveal: "L is for LION" with the picture, "A B C" filled in.
Trap: the animal's name anywhere on screen (a name tag, the alt text is fine) or the owl
saying "LION" in `sound` rounds. Art: icon only (`make-icon.py --text Aa`).

## 2. Clock (`clock`) - telling the time

Learns: reading an analog clock: o'clock, half past, quarter past and to, five-minute
steps; matching digital and analog. Bubbles carry a small clock face drawn on the canvas
(`drawClock(b)`: a white disc, twelve ticks, a short hour hand and a long minute hand),
which is why the bubble radius gets +6 like words.

| Rounds | Kind | Easy | Hard | Expert | Wrong bubbles |
| ------ | ---- | ---- | ---- | ------ | ------------- |
| 1-3 | `oclock` | prompt "3:00" digital, bubbles analog | prompt "3 O'CLOCK" in words | prompt analog, bubbles digital "3:00" | hands swapped, one hour off |
| 4-5 | `half` | "3:30" | "HALF PAST 3" | reverse | 3:00, 9:30, 4:30 |
| 6-7 | `quarter` | "3:15", "3:45" | "QUARTER PAST 3", "QUARTER TO 4" | reverse | the other quarter, the hour |
| 8-9 | `five` | "3:20" | "TWENTY PAST 3" | reverse | ten minutes off, hands swapped |
| 10, free | `mix` | | | | |

Owl: the digital time big in the text (`.say.clock`, letter-spaced); in expert the prompt
is a clock face in the icons row and the text is "?". Reveal: the analog face next to the
digital time and the words ("half past three"). Trap: showing the analog face in the
prompt when bubbles are analog (that is the answer); a digital prompt with analog bubbles
is the question. Art: icon only (a clock, Higgsfield, or `make-icon.py --text "3:00"`).

## 3. Shapes (`shapes`) - names, sides and corners

Learns: circle, triangle, square, rectangle, star, heart, diamond, oval, pentagon,
hexagon; counting sides and corners; the same shape rotated is the same shape. Bubbles
carry a shape drawn with canvas paths (`drawShape(b)`), filled white with the dark rim.

| Rounds | Kind | Easy | Hard | Expert | Wrong bubbles |
| ------ | ---- | ---- | ---- | ------ | ------------- |
| 1-3 | `sides` | "3 corners" with three dots to count; circle, triangle, square, star | "3 SIDES", six shapes | rotated shapes, pentagon/hexagon | the shape with one side more or fewer |
| 4-6 | `name` | the word in the text plus a dot-count hint ("SQUARE" and 4 dots) | the word alone | the word alone, rotated shapes | look-alikes (square/rectangle/diamond, circle/oval) |
| 7-8 | `odd` | "Which one is different?": all bubbles but one carry the same shape | shapes differ only by side count | ...and rotation | the copies |
| 9 | `both` | "RED TRIANGLE": colour and shape | | | right colour wrong shape and vice versa |
| 10, free | `mix` | | | | |

Owl: text and, in easy, dots for the corner count; never the shape itself except in
`both` rounds where the colour is the question and the shape is... no, never: in `both`
the text carries both words, the colour word in its colour. Reveal: the shape drawn big
with its name and "4 sides". Trap: any shape drawn in the prompt. Art: icon only
(Higgsfield "a triangle, a circle and a square").

## 4. Patterns (`patterns`) - what comes next

Learns: repeating patterns (AB, ABC, AAB), growing number patterns, counting forwards and
backwards in steps. Bubbles carry colours, animals or numbers the game already draws, so
the mode needs no new drawing code and no content art.

| Rounds | Kind | Easy | Hard | Expert | Wrong bubbles |
| ------ | ---- | ---- | ---- | ------ | ------------- |
| 1-2 | `ab` | red blue red blue ? (colour bubbles in the prompt) | three colours | longer prompt, `AAB` | the other pattern members |
| 3-4 | `abc` | animals | animals and colours mixed | | |
| 5-6 | `count` | 1 2 3 ? | 2 4 6 ? | 5 10 15 ?, 20 18 16 ? | the number one step off |
| 7-8 | `aab` | | | | |
| 9 | `back` | 10 9 8 ? | 30 25 20 ? | 100 90 80 ? | |
| 10, free | `mix` | | | | |

Owl: the sequence as small goal bubbles (`.seq`, the ordered-goal styling already exists)
ending in a "?" bubble, the text "What comes next?". Reveal: the same row with the answer
filled and glowing. Trap: a row so long the owl's bubble grows; cap at six items and shrink
the `.seq .gb` size for this mode. Art: icon only.

## 5. Compare (`compare`) - bigger, smaller, between, odd and even

Learns: number order and magnitude, the words bigger/smaller/between, odd and even.
Bubbles carry numbers (Math's drawing). Several bubbles can be right at once; the engine
handles that (`isTargetNow` is a rule, not a single value).

| Rounds | Kind | Easy | Hard | Expert | Wrong bubbles |
| ------ | ---- | ---- | ---- | ------ | ------------- |
| 1-3 | `bigger` | "BIGGER than 4" with 4 dots, numbers to 10 | to 20 | to 100 | numbers just below |
| 4-5 | `smaller` | | | | just above |
| 6-7 | `between` | "between 3 and 6" | | | the bounds themselves |
| 8-9 | `even` / `odd` | "EVEN" with paired dots | to 30 | to 100 | the neighbours |
| 10, free | `mix` | | | | |

Trap: the dots in the prompt draw the reference number, never a candidate; in `even`
rounds the paired dots show what even means, not which bubble. Art: icon only.

## 6. Spelling (`spelling`) - the missing letter

Learns: spelling the ten animals and seven colours, vowels, letter order. Bubbles carry
letters. Only when Letters is not in the game or the user asks; otherwise its rounds are
better as Letters rounds 8-10.

| Rounds | Kind | Easy | Hard | Expert |
| ------ | ---- | ---- | ---- | ------ |
| 1-3 | `first` | picture + "_ I O N" | picture only... no: "_ _ _ _" gives nothing to spell; keep the picture and blank the first letter | blank two letters, pop them in order |
| 4-6 | `last` | | | |
| 7-9 | `vowel` | | | |
| 10, free | `mix` | | | |

Trap: the word with only one letter blanked is a strong hint; that is the point in easy,
but expert blanks more. Never show the whole word. Art: icon only.

## 7. Rhymes (`rhymes`) - words that sound alike

Learns: rhyme families (cat/hat/bat, dog/frog/log). Needs reading, so easy round 1 uses
pictures of the ten animals where they rhyme (frog/dog/log) and short words elsewhere;
weakest fit for the youngest child, last in the list. Art: a few new pictures, so plan
the Higgsfield round trips before choosing it.

## Designing one that is not here

Same shape: a thing to learn with a real ladder from four to eight, bubbles that carry
candidates the engine already knows how to draw or a drawing you can do with paths, a
prompt a non-reader can act on in the early rounds, distractors that are neighbours of
the answer, and a reveal that states the rule. Write it into the design record with the
same tables and add it to this file in the same commit, so the next run knows it exists.
