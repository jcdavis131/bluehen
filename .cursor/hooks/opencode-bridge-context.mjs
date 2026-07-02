#!/usr/bin/env node
const context = "SYSTEM: opencode bridge mode is active.\nFor file changes through opencode-cursor, read any needed files first, then respond with exactly one JSON object and no prose:\n{\"name\":\"write\",\"arguments\":{\"path\":\"relative/path\",\"content\":\"complete file contents\"}}\nUse this only for a single complete-file write. Otherwise answer normally or use the available tool format.";
process.stdout.write(JSON.stringify({ additional_context: context }) + "\n");
