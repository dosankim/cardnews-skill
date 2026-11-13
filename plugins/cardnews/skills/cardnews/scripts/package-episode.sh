#!/usr/bin/env bash
# Zip a finished episode folder for handoff. The zip sits next to the folder.
set -euo pipefail
dir="${1:-}"
if [ -z "$dir" ] || [ ! -d "$dir" ]; then
  echo "usage: package-episode.sh episode-folder"
  exit 1
fi
dir="$(cd "$dir" && pwd)"
parent="$(dirname "$dir")"
name="$(basename "$dir")"
zipfile="$parent/${name}.zip"
rm -f "$zipfile"
(
  cd "$parent"
  zip -r -X "$zipfile" "$name" -x "*.zip" -x "*/media/src/*"
)
echo "zip → $zipfile"
