import { describe, it, expect } from "vitest";
import { execFileSync } from "child_process";
import path from "path";

const repoRoot = path.resolve(import.meta.dirname, "../..");

function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
}

/**
 * This dashboard renders real prompts, project paths and spend, so anything
 * capturing its output — a screenshot, a page snapshot, a transcript — is user
 * data. A .gitignore rule does not untrack a file that was committed before the
 * rule existed, which is how four screenshots of real sessions stayed live on a
 * public repo. These assertions fail on the tracked file itself, not on the
 * pattern, so the gap cannot reopen silently.
 */
describe("repository hygiene", () => {
  const files = trackedFiles();

  it("tracks no image files", () => {
    const images = files.filter((f) => /\.(png|jpe?g|gif|webp|bmp)$/i.test(f));
    expect(images).toEqual([]);
  });

  it("tracks no session transcripts", () => {
    const transcripts = files.filter((f) => f.endsWith(".jsonl"));
    expect(transcripts).toEqual([]);
  });

  it("tracks no browser-automation captures", () => {
    const captures = files.filter((f) => f.startsWith(".playwright-mcp/"));
    expect(captures).toEqual([]);
  });

  it("tracks no real environment file", () => {
    expect(files).not.toContain(".env");
  });

  it("contains no absolute home-directory paths outside fixtures", () => {
    // Fixtures legitimately contain synthetic /Users/... cwd values, which is
    // what a transcript records; they must not be real ones.
    // git grep exits 1 when nothing matches, which is the passing case here.
    let hits = "";
    try {
      hits = execFileSync(
        "git",
        [
          "grep",
          "-lI",
          "-e",
          "/Users/",
          "--",
          ".",
          ":!*__fixtures__*",
          // This file states the pattern literally, so it matches itself.
          ":!*repo-hygiene.test.ts",
        ],
        { cwd: repoRoot, encoding: "utf8" },
      ).trim();
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status !== 1) throw err;
    }
    expect(hits.split("\n").filter(Boolean)).toEqual([]);
  });
});
