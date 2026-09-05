#!/usr/bin/env bash
# Bubble Pop Safari — serve the game locally, expose it with ngrok, print a QR code.
#
#   ./serve.sh            # serves on port 8080 and opens an ngrok tunnel
#   PORT=9000 ./serve.sh  # different local port
#
# Stop everything with Ctrl+C.
set -uo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-8080}"
NGROK_PID=""
SERVER_PID=""

cleanup() {
  [ -n "$NGROK_PID" ] && kill "$NGROK_PID" 2>/dev/null
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null
  echo
  echo "Stopped the local server and ngrok."
}
trap cleanup EXIT
trap 'exit 0' INT TERM

lan_ip() {
  if command -v ipconfig >/dev/null 2>&1; then ipconfig getifaddr en0 2>/dev/null && return; fi
  if command -v hostname >/dev/null 2>&1; then hostname -I 2>/dev/null | awk '{print $1}' && return; fi
  echo ""
}

print_qr() {
  local url="$1"
  if command -v qrencode >/dev/null 2>&1; then
    qrencode -t ANSIUTF8 "$url"
  elif python3 -c "import qrcode" >/dev/null 2>&1; then
    python3 - "$url" <<'PY'
import sys, qrcode
q = qrcode.QRCode(border=1)
q.add_data(sys.argv[1])
q.make(fit=True)
q.print_ascii(invert=True)
PY
  elif command -v npx >/dev/null 2>&1; then
    npx --yes qrcode-terminal "$url"
  else
    echo "(No QR tool found. Install one: 'pip install qrcode' or 'brew install qrencode'.)"
  fi
}

# 1) Local static server -------------------------------------------------------
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to run the local server. Install it from https://www.python.org/downloads/"
  exit 1
fi
python3 -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "Could not start a server on port $PORT (already in use?). Try: PORT=9000 ./serve.sh"
  exit 1
fi
echo "Local:      http://localhost:$PORT"
IP="$(lan_ip)"
[ -n "$IP" ] && echo "Same Wi-Fi: http://$IP:$PORT"

# 2) ngrok ---------------------------------------------------------------------
if ! command -v ngrok >/dev/null 2>&1; then
  echo
  echo "ngrok is not installed. Install it, then run ./serve.sh again:"
  echo "  macOS:    brew install ngrok"
  echo "  Windows:  choco install ngrok   (or download from https://ngrok.com/download)"
  echo "  Linux:    curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null \\"
  echo "            && echo 'deb https://ngrok-agent.s3.amazonaws.com buster main' | sudo tee /etc/apt/sources.list.d/ngrok.list \\"
  echo "            && sudo apt update && sudo apt install ngrok"
  echo "Then add your token once (get it at https://dashboard.ngrok.com/get-started/your-authtoken):"
  echo "  ngrok config add-authtoken <YOUR_TOKEN>"
  echo
  echo "The local server is still running. Press Ctrl+C to stop it."
  wait "$SERVER_PID"
  exit 0
fi

if ! ngrok config check >/dev/null 2>&1; then
  echo
  echo "ngrok needs your auth token (one time). Get it at https://dashboard.ngrok.com/get-started/your-authtoken, then run:"
  echo "  ngrok config add-authtoken <YOUR_TOKEN>"
  echo "and run ./serve.sh again."
  echo
  echo "The local server is still running. Press Ctrl+C to stop it."
  wait "$SERVER_PID"
  exit 0
fi

NGROK_LOG="$(mktemp -t bubblepop-ngrok.XXXXXX)"
ngrok http "$PORT" --log=stdout --log-format=logfmt >"$NGROK_LOG" 2>&1 &
NGROK_PID=$!

URL=""
for _ in $(seq 1 30); do
  URL="$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null \
    | python3 -c 'import sys,json; t=json.load(sys.stdin).get("tunnels",[]); print(next((x["public_url"] for x in t if x["public_url"].startswith("https")), ""))' 2>/dev/null)"
  [ -z "$URL" ] && URL="$(grep -o 'url=https://[^ ]*' "$NGROK_LOG" 2>/dev/null | head -1 | cut -d= -f2)"
  [ -n "$URL" ] && break
  if ! kill -0 "$NGROK_PID" 2>/dev/null; then break; fi
  sleep 1
done

if [ -z "$URL" ]; then
  echo
  echo "ngrok did not give a public URL. Its log says:"
  grep -i -E "err|authtoken|4018|limit" "$NGROK_LOG" | head -5 | sed 's/^/  /'
  echo "Fix the problem above and run ./serve.sh again. The local server is still running (Ctrl+C to stop)."
  wait "$SERVER_PID"
  exit 1
fi

echo
echo "Phone:      $URL"
echo
print_qr "$URL"
echo
echo "Scan the QR code with your phone's camera. On the first visit ngrok shows a 'Visit Site' button; tap it once."
echo "Press Ctrl+C to stop both the local server and ngrok."
wait "$NGROK_PID"
