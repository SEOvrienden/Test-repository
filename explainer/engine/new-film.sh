#!/usr/bin/env bash
# Nieuwe film starten vanuit het sjabloon. Draai vanuit explainer/:  ./engine/new-film.sh 2026-11-onderwerp
set -euo pipefail
SLUG="${1:?gebruik: ./engine/new-film.sh <jjjj-mm-onderwerp>}"
[ -e "films/$SLUG" ] && { echo "films/$SLUG bestaat al"; exit 1; }
cp -r films/_template "films/$SLUG"
echo "Aangemaakt: films/$SLUG. Begin met BRIEF.md, daarna STORYBOARD.md, timeline.js en scenes.js."
