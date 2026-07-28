import { Router } from "express";
import { dataCache } from "../cache/dataCache.js";
import { getSessions } from "../utils/sessionCache.js";
import { buildOverviewStats } from "../processors/analyticsEngine.js";
import { computeDataCoverage } from "../providers/claudeCode/index.js";
import { describeProviders } from "../providers/registry.js";

export const overviewRouter = Router();

overviewRouter.get("/", async (_req, res) => {
  try {
    const sessions = await getSessions();

    const cacheKey = "overview";
    let stats = dataCache.get<ReturnType<typeof buildOverviewStats>>(cacheKey);
    if (!stats) {
      // Coverage is derived from Claude Code's own history file, so only
      // Claude Code sessions can be matched against it — passing another
      // provider's ids would report them all as deleted transcripts.
      const coverage = await computeDataCoverage(
        sessions
          .filter((s) => s.session.provider === "claude-code")
          .map((s) => s.session.sessionId),
      );
      stats = buildOverviewStats(
        sessions.map((s) => s.session),
        coverage,
        await describeProviders(sessions),
      );
      dataCache.set(cacheKey, stats);
    }

    res.json(stats);
  } catch (err) {
    console.error("Overview route error:", err);
    res.status(500).json({ error: "Failed to load overview stats" });
  }
});
