/** Strip global flags before command dispatch. */
export interface ParsedCli {
  orgId?: string;
  args: string[];
}

export function parseGlobalFlags(argv: string[]): ParsedCli {
  const args: string[] = [];
  let orgId: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--org" || a === "-o") {
      orgId = argv[++i];
      if (!orgId) throw new Error("--org requires a site id (e.g. hub, research-rag)");
      continue;
    }
    args.push(a);
  }
  return { orgId, args };
}
