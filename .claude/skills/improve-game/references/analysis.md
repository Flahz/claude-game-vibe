# Analyzing the game

The point of the analysis is to produce findings that turn into good picks: concrete,
located in the code, and honest about who benefits. "Add more animals" is an idea;
"the sticker book is full after ten rounds and nothing new happens in free play, so a
child who finished easy mode has no reason to open the game again (`startFree`,
`index.html:707`)" is a finding. Write findings, not ideas.

## Who you are analyzing for

- The player is 4 to 8. Cannot reliably read. Taps with a whole hand. Has no patience for
  a spinner and no tolerance for "you lost". Loves surprise, collecting, and being told
  they did well.
- The parent installs it once, hands the phone over in a car or a waiting room, and wants
  silence-able audio, no ads, no network, no in-app anything, and no way to leave the app
  by accident.
- The developer is the next run of this skill. Keep the code readable and the tests
  meaningful.

## Where to look, in order

1. **Broken things first.** Run the tests. Read `load()` and the save migration
   (`bps.v3` and the old keys): does a phone with an old save still work? Look at every
   `localStorage`, `try/catch`, and `setTimeout` for state that can go stale between
   screens (a timer that keeps running on the home screen, a toast that outlives its
   round, `resume` after a home-button tap).
2. **What the screenshots show.** Every device, every screen. Check tap targets (80px
   minimum for a child; `bubbleRadius` and the HUD buttons), text overlapping art, the
   goal pill wrapping on narrow phones, safe-area padding, the celebration card fitting
   on an iPhone SE, contrast of the colour words. Landscape is not supported by design;
   check it at least degrades gracefully.
3. **Feel.** Feedback latency on a tap (`pointerdown`, not `click`), whether wrong taps are
   gentle, whether a round ever leaves a child stuck (no target bubble on screen for
   seconds; `spawnBubble(forceTarget)` handles this, verify it), whether the difficulty
   ramp is smooth, whether hard and expert are actually different experiences.
4. **Depth and replay.** What happens after all stickers are earned. Is there anything to
   come back for. Rewards that build over sessions (streaks, a trophy shelf, a rare
   sticker) matter more to this age than new mechanics.
5. **Learning value.** Colour and animal words, counting, the math rounds: are the
   problems right for the age band, is the answer ever ambiguous, does the "find 4" dot
   display count correctly, does a wrong answer teach anything.
6. **Accessibility.** Colour goals with no second cue exclude colour-blind children;
   reduced-motion preference; sound-off users lose feedback that only exists as audio;
   `aria` on the few real buttons.
7. **Audio.** iOS unlock on first touch (`unlockMedia`), music and effects mute together,
   no clipping when many pops overlap, volume balance.
8. **Performance.** The frame loop (`update`, `drawBubble`): allocations per frame, canvas
   state changes, DOM writes inside the loop. The expert-round FPS check in `test/hard.js`
   is the guard; keep it above 40 on the test machine with headroom.
9. **PWA and offline.** `sw.js` FILES list versus the files actually used; the CACHE
   version bumped on every release; `manifest.webmanifest` icons and colours; whether a
   stale service worker can serve a half-updated game.
10. **Code health that blocks the next run.** Duplicated round-config logic between
    safari and math, magic numbers, the growing `onTap`. Only pick one of these if it
    makes another picked item easier or safer.

## Writing a finding

```
- [bug|polish|feature|a11y|perf|pwa|code] <one line, in the child's or parent's terms>
  where: index.html:<line> (<function>)   size: S|M|L   touches: <functions>
  why it matters: <one sentence>
  fix or feature: <one or two sentences, concrete enough to brief someone>
```

Sizes: S is under an hour for one agent including its test; M is a sitting; L does not
fit and must be cut to a slice that does.

## Turning findings into a good set

Independence is the thing people get wrong. `index.html` is one file, so git will report a
conflict for any two changes within a few lines of each other, and a real conflict when
two items both change the same function's behaviour. Before finalizing, list the
functions each item touches and make sure no function appears under two items, or if it
must (something in `onTap`, `update`, `completeRound`, `renderBook`), give that item
the shared core and keep the others out of it. Tell each subagent explicitly which
functions belong to someone else this run.

Anything that changes the save format (`KEY`, the shape under `bestAll`) is a shared-core
item: only one subagent may do it per run, and it must migrate old saves.

Ideas that have come up before and are usually good picks when they are not yet done:
a reward that spans sessions (daily sticker, streak, trophy shelf), a second cue for colour
goals (shape or pattern on the bubble), a "tap and hold to leave" parent lock on the home
button, reduced-motion support, a gentle idle hint when no target was tapped for a while,
a shapes or letters mode alongside animals and math, per-round variety in the celebration,
and a settings sheet for parents (music volume, which modes are on). Check the git log
before choosing: the previous run may have shipped it.
