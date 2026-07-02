#!/usr/bin/env node
/** Session start: B.U.I.L.D. boot + fleet queue context for Cursor (parity with OpenCode loop). */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const agent = process.env.BUILD_AGENT || "cursor";

function readTasksHead() {
  const tasksPath = join(root, "TASKS.md");
  if (!existsSync(tasksPath)) {
    return "(run: uv run python scripts/pick_task.py render)";
  }
  return readFileSync(tasksPath, "utf8").split("\n").slice(0, 14).join("\n");
}

function readBuildContext() {
  try {
    const out = execFileSync(
      "uv",
      ["run", "python", "scripts/build_sync.py", "context", "--agent", agent, "--digest"],
      { cwd: root, encoding: "utf8", timeout: 30_000, windowsHide: true },
    );
    return out.trim();
  } catch {
    return [
      "SYSTEM: Blue Hen RE session boot (build_sync unavailable)",
      "Read docs/wiki/SESSION_BOOT.md",
      `Claim: pick_task.py claim <ID> --agent ${agent}`,
    ].join("\n");
  }
}

const boot = readBuildContext();
const tasks = readTasksHead();

const context = `${boot}

--- TASKS.md (head) ---
${tasks}
---`;

process.stdout.write(JSON.stringify({ additional_context: context }) + "\n");
