# The decision record

One markdown file per debate, committed with the feature: `decisions/<YYYY-MM-DD>-<slug>.md`
(`slug` is the winner's). It has two readers: the user, who wants to know why this
feature and not another; and the next run of this skill, which must not re-propose a
rejected idea without a new argument and should pick up the runners-up that were
merely deferred. Keep it under 60 lines. The full transcript stays in the scratch
dir; the record is the summary a busy person reads in two minutes.

```markdown
# <Winner title>

Date: <YYYY-MM-DD>   Focus: <the user's focus, or "open">   Debaters: child, teacher, parent, engineer[, <specialist>]

## Question
<One sentence: what this run set out to decide, including the focus.>

## Proposals
| # | Title | From | Size | Points | Supports / Objections |
| - | ----- | ---- | ---- | ------ | --------------------- |
| 1 | <title> | child | S | 7 | 3 / 0 |
| ... |

## Decision
**<Winner title>** - <two sentences: what the child gets, and what is learned>.

Why it won: <two or three sentences: the deciding arguments, which lens made them,
and whether the judge followed or overrode the vote, and why>.

Acceptance criteria (the builder is held to these):
- <observable behaviour>
- <observable behaviour>
- <how it keeps the learning rule, if it involves questions or answers>
- Test: test/<file>.js checks <what>.

## Rejected and deferred
- **<title>** - rejected: <the argument that sank it, one line, and whose it was>.
- **<title>** - deferred: <why not now; what would make it a good pick next time>.
- **<title>** - vetoed by <lens>: <reason>.

## For next time
<One or two lines: the runner-up worth building next, or the open question the
debate surfaced.>
```

Write it during phase 3 so it exists even if the build fails. If the build is dropped
in phase 5, add a line under Decision saying so and why, and still commit the record
in a release of its own (no cache bump is needed when the game files did not change).
With `--decide-only` the record is not committed; print it and leave it in the
scratch dir so the user can decide what to do with it.
