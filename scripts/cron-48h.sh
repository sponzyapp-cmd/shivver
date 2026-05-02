#!/usr/bin/env bash
set -e

cd /root/.openclaw/workspace/shivver
LOG=~/.shivver/logs/cron-48h.log
START_FILE=~/.shivver/logs/cron-start-time
CRON_SCRIPT="/root/.openclaw/workspace/shivver/scripts/run-test-with-ollama.sh"

# Initialize start time if not exists
if [ ! -f "$START_FILE" ]; then
  echo "$(date +%s)" > "$START_FILE"
  echo "[$(date)] Cron 48h cycle started" >> "$LOG"
fi

START_EPOCH=$(cat "$START_FILE")
NOW_EPOCH=$(date +%s)
ELAPSED=$((NOW_EPOCH - START_EPOCH))
MAX_SECONDS=$((48 * 3600))

if [ $ELAPSED -gt $MAX_SECONDS ]; then
  echo "[$(date)] 48 hours elapsed — removing hourly cron" >> "$LOG"
  # Remove this cron line from root's crontab
  crontab -l 2>/dev/null | grep -v "$CRON_SCRIPT" | crontab - 2>/dev/null || true
  rm -f "$START_FILE"
  exit 0
fi

# Run the test
echo "[$(date)] Running hourly test (elapsed: $((ELAPSED/3600))h $(((ELAPSED%3600)/60))m)" >> "$LOG"
bash "$CRON_SCRIPT" >> "$LOG" 2>&1
EXIT=$?

if [ $EXIT -ne 0 ]; then
  echo "[$(date)] Test failed with exit code $EXIT" >> "$LOG"
else
  echo "[$(date)] Test passed" >> "$LOG"
fi

exit $EXIT
