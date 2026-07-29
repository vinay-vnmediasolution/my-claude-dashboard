const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SKIP_SEGMENTS = new Set([
  "workspaces",
  "instances",
  "default",
  "support",
  "library",
  "application",
]);

function toTitleCase(seg: string): string {
  return seg
    .split(/[-_ ]+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .join(" ")
    .trim();
}

/**
 * Human-readable project name for a working directory, walking up past
 * machine-generated segments (uuids, "workspaces", "default") so a session in
 * .../workspaces/<uuid> is still attributed to the repo that contains it.
 *
 * Shared across providers: every coding agent records a cwd, and the same
 * directory must produce the same project name regardless of which agent ran
 * there — otherwise per-project totals split in two.
 */
export function deriveProjectName(cwd: string): string {
  const parts = cwd.split("/").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const seg = parts[i];
    if (!UUID_RE.test(seg) && !SKIP_SEGMENTS.has(seg.toLowerCase())) {
      return toTitleCase(seg);
    }
  }
  return toTitleCase(parts[parts.length - 1] ?? cwd);
}
