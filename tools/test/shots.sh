#!/bin/sh
# Usage (Git Bash): sh tools/test/shots.sh name WxH url [name WxH url ...]
# Takes headless Edge screenshots one at a time into tools/test/shots/.
# Start the preview server first: npm run serve
# Example: sh tools/test/shots.sh home 1400x3000 "http://localhost:5173/index.html?shot=1"
# Phone width: use phone.html, e.g. "file:///<full path>/tools/test/phone.html#merch.html%3Fshot%3D1"
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
OUTU="$(cd "$(dirname "$0")" && pwd)/shots"
mkdir -p "$OUTU"
OUT="$(cygpath -w "$OUTU")"
while [ $# -ge 3 ]; do
  name=$1; size=$2; url=$3; shift 3
  rm -f "$OUTU/$name.png"
  timeout 45 "$EDGE" --headless=new --disable-gpu --hide-scrollbars --no-first-run --user-data-dir="$OUT\\prof-$name" \
    --virtual-time-budget=3000 --window-size=$size --screenshot="$OUT\\$name.png" "$url" >/dev/null 2>&1
  i=0
  while [ ! -s "$OUTU/$name.png" ] && [ $i -lt 40 ]; do timeout 0.5 tail -f /dev/null; i=$((i+1)); done
  if [ -s "$OUTU/$name.png" ]; then echo "ok $name"; else echo "MISSING $name"; fi
done
