#!/usr/bin/env bash
# Run every Playwright test in test/ against a throwaway local server.
# Usage: run-tests.sh [repo-dir] [out-dir]
#   repo-dir  defaults to the current directory (use the worktree you are working in)
#   out-dir   where each test writes its screenshots; defaults to a temp dir
# Picks a free port, so several copies can run at the same time in different worktrees.
# Exit code is 0 only when every test printed PASS and exited 0.
set -u
REPO="${1:-$(pwd)}"
OUT="${2:-${TMPDIR:-/tmp}/bps-tests-$$}"
cd "$REPO" || { echo "no such dir: $REPO"; exit 2; }
mkdir -p "$OUT"

PORT=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
for _ in $(seq 1 50); do
  curl -sf "http://127.0.0.1:$PORT/" >/dev/null 2>&1 && break
  sleep 0.2
done

if [ -z "${NODE_PATH:-}" ]; then
  NODE_PATH="$(npm root -g 2>/dev/null)"
  export NODE_PATH
fi

fail=0
for t in test/*.js; do
  name=$(basename "$t" .js)
  echo "== $name"
  log="$OUT/$name.log"
  if timeout 420 node "$t" "http://127.0.0.1:$PORT" "$OUT/$name" >"$log" 2>&1; then
    tail -n 3 "$log"
  else
    fail=1
    echo "-- $name FAILED (full log: $log)"
    tail -n 30 "$log"
  fi
done

if [ "$fail" -eq 0 ]; then echo "ALL TESTS PASSED  (screenshots in $OUT)"; else echo "SOME TESTS FAILED (screenshots in $OUT)"; fi
exit $fail
