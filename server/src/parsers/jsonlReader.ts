import { createReadStream } from "fs";
import { createInterface } from "readline";

export async function* readJsonlLines(
  filePath: string,
): AsyncGenerator<unknown> {
  const fileStream = createReadStream(filePath, { encoding: "utf8" });
  const rl = createInterface({ input: fileStream, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      yield JSON.parse(trimmed);
    } catch {
      // skip malformed lines — resilience over completeness
    }
  }
}

export async function readAllJsonlLines(filePath: string): Promise<unknown[]> {
  const results: unknown[] = [];
  for await (const line of readJsonlLines(filePath)) {
    results.push(line);
  }
  return results;
}
