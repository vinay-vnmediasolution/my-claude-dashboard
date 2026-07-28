import { Router } from "express";
import { dataCache } from "../cache/dataCache.js";
import { getSessions } from "../utils/sessionCache.js";
import { buildOverviewStats } from "../processors/analyticsEngine.js";
import { computeDataCoverage } from "../utils/sessionHistory.js";

export const overviewRouter = Router();

overviewRouter.get("/", async (_req, res) => {
  try {
    const sessions = await getSessions();

    const cacheKey = "overview";
    let stats = dataCache.get<ReturnType<typeof buildOverviewStats>>(cacheKey);
    if (!stats) {
      const coverage = await computeDataCoverage(
        sessions.map((s) => s.session.sessionId),
      );
      stats = buildOverviewStats(
        sessions.map((s) => s.session),
        coverage,
      );
      dataCache.set(cacheKey, stats);
    }

    res.json(stats);
  } catch (err) {
    console.error("Overview route error:", err);
    res.status(500).json({ error: "Failed to load overview stats" });
  }
});
