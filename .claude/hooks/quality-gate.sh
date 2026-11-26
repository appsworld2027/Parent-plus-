#!/usr/bin/env bash
# Claude Code Stop hook — AGENTS.md §7A rule 3 (build loop).
# Runs whenever Claude tries to finish. Exit 0 = allow. Exit 2 = keep working (stderr goes back to Claude).
# Env: QUALITY_GATE=off (founder-only manual sessions), QUALITY_GATE_CMD (default "npm run check"),
#      QUALITY_GATE_MAX_ROUNDS (default 5), QUALITY_GATE_BASE (default origin/main).
set -uo pipefail
INPUT="$(cat 2>/dev/null || true)"
[ "${QUALITY_GATE:-on}" = "off" ] && exit 0
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}" || exit 0

SESSION="$(printf '%s' "$INPUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).session_id||"default")}catch{console.log("default")}})' 2>/dev/null || echo default)"
SESSION="${SESSION//[^A-Za-z0-9_-]/}"; SESSION="${SESSION:-default}"
STATE="${TMPDIR:-/tmp}/quality-gate-$SESSION"
CMD="${QUALITY_GATE_CMD:-npm run check}"
MAX="${QUALITY_GATE_MAX_ROUNDS:-5}"
BASE="${QUALITY_GATE_BASE:-origin/main}"

# Nothing changed compared with the base branch (committed, uncommitted or new files)? Nothing to verify.
if git diff --quiet "$BASE" -- 2>/dev/null && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  rm -f "$STATE.count"; exit 0
fi

if bash -c "$CMD" >"$STATE.log" 2>&1; then
  rm -f "$STATE.count"; exit 0
fi

ROUNDS=$(( $(cat "$STATE.count" 2>/dev/null || echo 0) + 1 ))
echo "$ROUNDS" > "$STATE.count"
if [ "$ROUNDS" -gt "$MAX" ]; then
  rm -f "$STATE.count"; exit 0   # gave up last round; the agent was told to mark ai:blocked
fi
if [ "$ROUNDS" -eq "$MAX" ]; then
  { echo "Quality gate still failing after $MAX rounds ('$CMD'). Per AGENTS.md §7A rule 3: STOP fixing now."
    echo "Label the issue/PR ai:blocked, write what you tried and the failing output, then finish. Do not report done."
    echo "--- last 30 lines ---"; tail -n 30 "$STATE.log"; } >&2
  exit 2
fi
{ echo "Quality gate FAILED (round $ROUNDS/$MAX): '$CMD' did not pass. You may not stop or report done while checks fail (AGENTS.md §7A rule 3)."
  echo "Fix the cause, re-run the checks, then finish. Never edit, skip or delete tests in e2e/acceptance/ (contract-lock)."
  echo "--- last 40 lines ---"; tail -n 40 "$STATE.log"; } >&2
exit 2
