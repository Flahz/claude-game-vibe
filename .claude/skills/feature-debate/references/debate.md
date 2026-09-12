# The debate

The debate exists because one agent picking "the best feature" reliably picks the
feature that is easiest to imagine, not the one a child, a teacher and a parent would
all be glad to find. Four people with different stakes, forced to argue in a fixed
format and then rank each other's ideas, produce a far better shortlist than one
brainstorm. Your job as moderator is to give each of them a real lens, keep the
rounds short, and not let the format collapse into four agents agreeing with each
other.

## The lenses

Each debater gets exactly one. Tell it who it is in the first line of its prompt and
insist it argue only from that seat; the disagreement is the product.

- **The child** (age 4 to 8, cannot read). Cares about fun, surprise, collecting,
  being told they did well, having a reason to open the game again tomorrow. Judges a
  feature by whether it would make them squeal or shrug. Has no interest in what is
  "educational" and says so.
- **The teacher**. Cares about what the child actually learns and remembers: colours,
  animals, counting, arithmetic, foreign words. Guards the learning rule from
  `CLAUDE.md` (never show the answer while the child is trying; reveal it only after a
  failure) and the age band: too easy is boring, too hard is a wall. Distrusts
  features that are fun but let the child stop thinking.
- **The parent**. Installs it once and hands the phone over in a car or a waiting
  room. Cares about calm, no frustration, no losing, silence-able sound, nothing that
  needs the network, nothing that leads out of the app, nothing that needs the parent
  to explain. Notices accessibility (colour-blind children, reduced motion) because
  their child or their friend's child needs it.
- **The engineer**. Knows `index.html` is one 1000-line file with no build step and
  that everything ships to `main`. Cares about whether the thing can be built in one
  sitting by one agent with a Playwright test through `window.__bps`, which functions
  it touches, whether it changes the save format, whether it needs new art (a real
  cost: Higgsfield pipeline, 208px webp, `sw.js` list), and whether it can regress
  the expert-round frame rate. Kills L-sized proposals or cuts them to an S slice.

With a narrow focus add a **specialist**: a language teacher for the words mode, a
maths teacher for the math mode, an early-years teacher for "4-year-olds". The
specialist argues from domain knowledge (which words, which sums, which sequence of
difficulty), not from a fifth copy of the teacher's seat.

## Round 1: proposals

Each debater reads the state-of-the-game brief, then reads whatever code it needs
(give it the absolute repo path; the brief has the function map), and returns exactly
two proposals in this format, followed by one line naming the one it would fight for
and why.

```
### Proposal: <title>            slug: <kebab-case>
Pitch: <two sentences in the child's or parent's terms: what happens, why they care>
On screen: <what the child sees and taps, step by step, no reading required>
Learning: <what is learned or reinforced; how it keeps the learning rule>
Size: S | M | L   Touches: <functions, with index.html line numbers>   New art: <none | list>
Test: <one sentence: what a Playwright test through __bps would check>
Risk: <what could go wrong for the child or for the merge, one line>
```

Rules the moderator states in the prompt:
- Not an idea that lost a previous debate unless the argument is new (list them).
- Not something the last ten commits already shipped (list them).
- Not two variants of the same idea; the two proposals should be different in kind.
- Size honestly: S is under an hour for one agent including its test, M is a sitting,
  L does not fit and must arrive already cut to the slice that does.
- Serve the focus if there is one.
- No questions; the debater decides and writes it down.

Spawn all debaters in one turn (Agent tool, general-purpose, `run_in_background: true`).
Prompts are self-contained: the lens, the brief (pasted, or the absolute path of the
scratch file with an instruction to read it first; the path is cheaper and works just
as well), the repo path marked read-only, the format, the rules. Ask for the reply to
be the proposals and nothing else. Expect one to three minutes per debater.

## Round 2: rebuttals and ballot

Collect every proposal into one numbered list (eight to ten of them), with the seat
that made it, and send it to every debater. Before sending, look for clusters: four
seats given the same focus usually converge on two or three underlying ideas (three
egg variants, three "ask again what was missed" variants). Name the clusters in the
round-2 message and say that an AMEND merging a cluster is welcome and carries the
merged proposals' points; that one sentence turns round 2 from eight rankings of
near-duplicates into a real negotiation over the two or three ideas that matter.
Prefer continuing each agent with SendMessage so it keeps what it read (tell it which
numbers are its own); otherwise spawn fresh agents with the lens, the brief and the
full list.

Each debater returns:

```
## Positions
<n>. <title> - SUPPORT | OBJECT | AMEND: <one to three lines, concrete, from its lens>
   (for AMEND: the merged or cut-down version in one line, and which proposals it replaces)
...

## Ballot
1. <title>   2. <title>   3. <title>
Veto: <title> - <reason>      (only for a learning-rule or kids-first violation; else "none")
```

Tell them the ballot is ranked, that they may rank their own proposal but not first
and second both, and that an objection has to say what goes wrong, not that they
prefer something else. A veto is serious: it is for "shows the answer on screen",
"needs the network", "makes a 4-year-old feel they lost", not for "I would not
build this".

## Tallying

Give 3, 2, 1 points for first, second, third place on each ballot. Add the round-1
"fight for" as one more point. Count supports and objections per proposal. An AMEND
that two or more debaters adopt replaces the proposals it merges; carry their points
over. A vetoed proposal is out if the judge agrees the reason is real; if the judge
disagrees, it stays and the record says why.

The tally is an input to the rubric in SKILL.md, not the decision. Typical outcomes:
one clear winner (ship it); two close (judge picks by buildable and low risk, because
a feature that lands green this run beats a slightly better one that does not); a
winner the engineer sized L (ship the S slice the engineer described, and record the
rest as a future proposal).

## Keeping it honest

- Do not paste one debater's round-1 output into another's round-1 prompt. Round 1 is
  independent by design.
- Do not let the format grow. Two proposals, three positions each, one ballot. Long
  debates produce long transcripts and no better decisions.
- Keep the full transcript in the scratch dir; only the summary goes in the decision
  record.
- If a debater ignores its lens (the child arguing about save formats), discount its
  ballot and say so in the record.
