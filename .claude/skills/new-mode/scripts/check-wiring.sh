#!/usr/bin/env bash
# Check that a mode is wired everywhere the game expects it.
# Usage: check-wiring.sh <repo-or-worktree> <mode-id> [--name <Button label>]
# Greps index.html, sw.js, README.md, manifest.webmanifest, art/ and test/ for every touch point in
# references/wiring.md that can be found by pattern. Prints one line per check; exits 1 if a required
# check is missing. "warn" lines are things a mode usually wants but can legitimately skip.
set -u
REPO="${1:?usage: check-wiring.sh <repo> <mode-id> [--name Label]}"
ID="${2:?usage: check-wiring.sh <repo> <mode-id> [--name Label]}"
NAME=""; if [ "${3:-}" = "--name" ]; then NAME="${4:-}"; fi
cd "$REPO" || { echo "no such dir: $REPO"; exit 2; }
H=index.html
fail=0
ok(){ printf '  ok    %s\n' "$1"; }
miss(){ printf '  MISS  %s\n' "$1"; fail=1; }
warn(){ printf '  warn  %s\n' "$1"; }
has(){ grep -qE -- "$1" "$2" 2>/dev/null; }
req(){ if has "$1" "$2"; then ok "$3"; else miss "$3"; fi; }
opt(){ if has "$1" "$2"; then ok "$3"; else warn "$3"; fi; }

echo "== $ID in $REPO"
echo "-- data"
block(){ awk "/$1/,/$2/" $H; }   # a multi-line table, first-line pattern to last-line pattern
block "const MODES *= *\\[" "\\];" | grep -q "'$ID'" && ok "MODES contains '$ID'" || miss "MODES contains '$ID'"
block "const ANIMALS *= *\\{" "};" | grep -qE "\\b$ID:'" && ok "ANIMALS has an emoji fallback for '$ID'" || miss "ANIMALS has an emoji fallback for '$ID'"
block "const ART_SRC *= *\\{" "};" | grep -qE "\\b$ID:'art/$ID\\.webp'" && ok "ART_SRC has $ID:'art/$ID.webp'" || miss "ART_SRC has $ID:'art/$ID.webp'"
req "\b$ID:true" $H "round objects carry the flag '$ID:true'"
req "free:true[^}]*\b$ID:true|\b$ID:true[^}]*free:true" $H "a free-play round object for the mode (free:true + $ID:true)"
opt "quiz:true" $H "rounds use the shared quiz flag (quiz:true) rather than growing cur.math||cur.words chains"
echo "-- home screen"
req "data-mode=\"$ID\"" $H "a mode button with data-mode=\"$ID\""
req "data-testid=\"mode-$ID\"" $H "the button has data-testid=\"mode-$ID\""
req "src=\"art/$ID\.webp\"" $H "the button shows art/$ID.webp"
if [ -n "$NAME" ]; then req "aria-label=\"$NAME\"" $H "the button is labelled \"$NAME\""; fi
echo "-- engine"
req "function nextQuestion\(\).*cur\.$ID" $H "nextQuestion() starts a question for the mode"
req "function isTargetNow\(b\).*cur\.$ID" $H "isTargetNow() knows the mode"
awk "/function spawnBubble\(/,/^}/" $H | grep -q "cur\.$ID" && ok "spawnBubble() has a branch for the mode" || miss "spawnBubble() has a branch for the mode"
awk "/function goalText\(\)/,/^}/" $H | grep -q "cur\.$ID" && ok "goalText() has the owl's words for the mode" || miss "goalText() has the owl's words for the mode"
awk "/function renderGoal\(\)/,/^}/" $H | grep -q "cur\.$ID" && ok "renderGoal() draws the question for the mode" || miss "renderGoal() draws the question for the mode"
awk "/function answerHtml\(\)/,/^}/" $H | grep -q "cur\.$ID" && ok "answerHtml() reveals the answer for the mode" || miss "answerHtml() reveals the answer for the mode"
awk "/function onTap\(x,y\)/,/^}/" $H | grep -qE "cur\.$ID|cur\.quiz" && ok "onTap() moves to the next question for the mode (cur.$ID or cur.quiz)" || miss "onTap() moves to the next question for the mode (cur.$ID or cur.quiz)"
awk "/function update\(dt\)/,/^}/" $H | grep -qE "cur\.$ID|cur\.quiz" && ok "update() refreshes isTarget for the mode (cur.$ID or cur.quiz)" || miss "update() refreshes isTarget for the mode (cur.$ID or cur.quiz)"
awk "/function loseRound\(\)/,/^}/" $H | grep -qE "cur\.$ID|cur\.quiz" && ok "loseRound() reveals for the mode (cur.$ID or cur.quiz)" || miss "loseRound() reveals for the mode (cur.$ID or cur.quiz)"
req "function roundFor\(n\).*mode==='$ID'" $H "roundFor() returns the mode's rounds"
req "function startFree\(\).*mode==='$ID'" $H "startFree() has the mode's free play"
awk "/function setMode\(m, quiet\)/,/^}/" $H | grep -q "'$ID'" && ok "setMode() toasts the mode's name" || miss "setMode() toasts the mode's name"
awk "/function goHome\(party\)/,/^}/" $H | grep -q "'$ID'" && ok "goHome() has a party toast for the mode" || warn "goHome() has a party toast for the mode"
awk "/window\.__bps *= *\{/,/^\};/" $H | grep -qE "\b$ID\b|quiz" && ok "__bps.state() mentions the mode (check by hand that problem exposes kind, text, key)" || warn "__bps.state() does not mention '$ID': make sure problem exposes kind, text, key for it"
echo "-- files"
if [ -f "art/$ID.webp" ]; then
  dims=$(python3 -c "from PIL import Image; im=Image.open('art/$ID.webp'); print(im.size[0],im.size[1],im.mode)" 2>/dev/null || echo "? ? ?")
  case "$dims" in "208 208 RGBA") ok "art/$ID.webp is 208x208 with alpha";; *) miss "art/$ID.webp is 208x208 with alpha (got: $dims)";; esac
else miss "art/$ID.webp exists"; fi
req "'\./art/$ID\.webp'" sw.js "sw.js lists ./art/$ID.webp in FILES"
if [ -d .git ] || git rev-parse --git-dir >/dev/null 2>&1; then
  base=$(git show main:sw.js 2>/dev/null | grep -oE "bps-cache-v[0-9]+"); now=$(grep -oE "bps-cache-v[0-9]+" sw.js)
  if [ -n "$base" ] && [ "$base" = "$now" ]; then warn "sw.js CACHE ($now) not bumped yet (do it once, at release)"; else ok "sw.js CACHE is $now (main: ${base:-?})"; fi
fi
[ -f "test/$ID.js" ] && ok "test/$ID.js exists" || miss "test/$ID.js exists"
req "test/$ID\.js" README.md "README.md lists test/$ID.js"
if [ -n "$NAME" ]; then req "\| *$NAME *\|" README.md "README.md games table has a $NAME row"; else opt "$ID" README.md "README.md mentions the mode"; fi
req "'$ID'" README.md "README.md test-hook line names setMode('$ID')"
opt "$ID" manifest.webmanifest "manifest.webmanifest description names the subject (or a word for it)"
opt "$ID" test/lives.js "test/lives.js knows the mode (isRight / noGiveaway)"
ls decisions/*mode-$ID* >/dev/null 2>&1 && ok "decisions/ has the design record" || warn "decisions/ has the design record (added at release)"
echo
if [ $fail -eq 0 ]; then echo "WIRING COMPLETE for '$ID'"; else echo "WIRING INCOMPLETE for '$ID': fix every MISS line"; fi
exit $fail
