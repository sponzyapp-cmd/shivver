#!/usr/bin/env bash
set -e

cd /root/.openclaw/workspace/shivver

# Ensure Ollama is running
if ! pgrep -x "ollama" > /dev/null; then
  echo "[$(date)] Starting Ollama..."
  nohup ollama serve > /tmp/ollama.log 2>&1 &
  sleep 5
fi

# Ensure model is pulled (only once, cheap if already present)
if ! curl -s http://localhost:11434/api/tags | grep -q "llama3:70b"; then
  echo "[$(date)] Pulling llama3:70b..."
  ollama pull llama3:70b || true
fi

# Run test suite
echo "[$(date)] Running Shivver offline test..."
node test-offline.js
EXIT=$?

# Log summary
if [ $EXIT -eq 0 ]; then
  echo "[$(date)] ✓ Test PASSED" >> ~/.shivver/logs/cron-summary.log
else
  echo "[$(date)] ✗ Test FAILED (exit $EXIT)" >> ~/.shivver/logs/cron-summary.log
fi

exit $EXIT
