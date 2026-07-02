#!/usr/bin/env node
/** Session start: inject fleet team + work-queue context for Cursor agents. */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const tasks = existsSync(join(root, "TASKS.md"))
  ? readFileSync(join(root, "TASKS.md"), "utf8").split("\n").slice(0, 12).join("\n")
  : "(run: uv run python scripts/pick_task.py render)";

const context = `SYSTEM: Blue Hen RE — collaborative agent team.

INIT (before coding):
1. docs/AGENT_INIT.md + .cursor/rules/00-fleet-team.mdc
2. uv run python scripts/pick_task.py blockers && pick_task.py list
3. pick_task.py claim <TASK-ID> --agent cursor
4. Read specs/NNNN-*.md for claimed task
5. pick_task.py done <ID> && render when finished

Queue: config/work_queue.json · Claude lane: .claude/CLAUDE.md · Team: .claude/TEAM.md

--- TASKS.md (head) ---
${tasks}
---`;

process.stdout.write(JSON.stringify({ additional_context: context }) + "\n");
