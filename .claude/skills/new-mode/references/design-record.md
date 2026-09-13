# The design record

Written before any code, to a scratch file; committed as `decisions/<date>-mode-<id>.md`
at release with the "Changes during the build" section filled in. It is what the next run
of this skill reads to know which subjects are taken and what went wrong last time, and
what the reviewer holds the build to. Keep it under 120 lines.

```
# <Name> mode: <one line, what the child learns>

Date: <yyyy-mm-dd>   Subject asked for: <argument, or "none (catalog: <entry>)">   Id: `<id>`   Icon: art/<id>.webp

## What it teaches, and for whom
<Three to five lines. The skill at round 1 (a four-year-old, no reading) and at round 10
(an eight-year-old). Why it is not a re-skin of Animals, Math or Words.>

## The ladder
| Round | Kind | Easy asks | Hard asks | Expert asks | Wrong bubbles are |
| ----- | ---- | --------- | --------- | ----------- | ----------------- |
| 1 | ... | ... | ... | ... | ... |
| ... | | | | | |
| 10 | mix | | | | |
| free | mix | | | | |
<Every row is answerable; hard and expert grow the range or swap a picture for a word,
never remove a step a child needs. Five pops per round.>

## The bubble
- Target carries: <field and value>
- Wrong carries: <how distractors are chosen; neighbours of the answer, not random>
- Drawn: <label text / animal / canvas drawing, and the size rule>
- Bombs: <hard/expert, on wrong bubbles, as the other modes>

## The owl
| Kind | Text (`goalText`) | Icons (`renderGoal`) | What a non-reader gets |
| ---- | ----------------- | -------------------- | ---------------------- |
<Fits the height of "Find 10" with its dots.>

## The reveal (`answerHtml`)
| Kind | Shows |
| ---- | ----- |
<The question with the answer filled in, plus the picture or rule.>

## Learning-rule check
| Kind | What could give the answer away | Why it does not |
| ---- | ------------------------------- | --------------- |

## Art
<New files, how each is made (Higgsfield prompt, or make-icon.py arguments), or "icon only".>

## Test plan
<Which rounds test/<id>.js plays, the no-giveaway check per kind, the reveal in easy and
the lost round in hard, separate progress, the expert round, what lives.js gains.>

## Changes during the build
<Filled in at release: rounds reshaped, engine changes made for every mode (quiz flag,
label drawing), bugs found in the shared code, test flakes and their fixes.>

## Not built because
<Only when the run releases the record alone.>
```
