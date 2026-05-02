# Shivver Offline Mode — Fix-in-Progress

## Current State (2026-04-29)

- **Mode**: `SHIVVER_MODE=local` (SQLite + Ollama)
- **Build**: ✓ Compiles cleanly
- **Server**: Starts successfully
- **Migrations**: `local.ts` runs and logs `[DB] Up-to-date (v2)`
- **Bug**: `GET /api/agi` returns `{"database":"error"}` instead of `"connected"`

## Root Cause (Hypothesis)

The AGI health check runs:
```ts
await db.select().from(users).limit(1)
```
and throws. Likely causes:
1. `db` instance not properly initialized for SQLite (drizzle-orm/better-sqlite3 driver loading)
2. `users` table schema mismatch between drizzle schema and actual SQLite table
3. `db.select()` call failing due to driver quirks

## Files Already Modified
- `src/lib/db/index.ts` — unified conditional loader (ESM + top-level await local import)
- `src/lib/db/index-sqlite.ts` — pure SQLite export (no longer used directly)
- `src/lib/db/schema-sqlite.ts` — SQLite column definitions (integer PK, timestamp modes)
- `src/lib/db/local.ts` — migration SQL that creates tables (different column names)
- All imports updated to use `@/lib/db` unified entry

## Active Sub-Agent
Running in background (session: agent:main:subagent:0254b442-…).
Task: Diagnose DB error, fix, verify lead_finder offline, document results.

## Cron Setup
- Hourly test script: `scripts/run-test-with-ollama.sh` (starts Ollama, runs node test-offline.js)
- 48h self-removing cron: `scripts/cron-48h.sh` (executes hourly, removes itself after 48h)
- System cron installed via `crontab` (or system crontab) — line:
  ```
  0 * * * * /root/.openclaw/workspace/shivver/scripts/cron-48h.sh
  ```

## Next Steps After Sub-Agent Completes
1. Read DB_FIX_SUMMARY.md for final changes
2. Verify full offline test manually (Ollama running, SHIVVER_MODE=local)
3. Wire Telegram push notifications for AGI alerts
4. Implement full event collector logic (Stripe offline cache, lead flow scans)
5. Add daily/weekly war reports
