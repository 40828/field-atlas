const SAFE_PATH = /^(?!\/)(?!.*\.\.)[A-Za-z0-9._\- /]+$/;

export function sanitizeGeneratedFiles(files: Array<{ path: string; content: string }>): {
  map: Record<string, string>;
  rejected: string[];
} {
  const map: Record<string, string> = {};
  const rejected: string[] = [];
  let total = 0;
  for (const f of files) {
    const path = f.path.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!SAFE_PATH.test(path) || path.length > 120) {
      rejected.push(path || f.path);
      continue;
    }
    if (f.content.length > 60_000) {
      rejected.push(`${path} (too large)`);
      continue;
    }
    total += f.content.length;
    if (total > 400_000) {
      rejected.push(`${path} (project size cap)`);
      continue;
    }
    map[path] = f.content;
  }
  return { map, rejected };
}

export const DEFAULT_PROTOTYPE_HINT = `Create a small static or Vite TypeScript prototype.
Required files:
- README.md explaining what was generated and what was NOT verified
- package.json with a "test" script (even if it just checks a few invariants) and a "build" script
- index.html or src/main.ts entry
Keep dependencies minimal. No secrets. No install scripts that phone home.`;
