import { Router } from "express";
import { dataCache } from "../cache/dataCache.js";
import { loadAllSessions } from "../processors/sessionAggregator.js";
import { buildOverviewStats } from "../processors/analyticsEngine.js";

export const overviewRouter = Router();

overviewRouter.get("/", async (_req, res) => {
  try {
    let sessions =
      dataCache.get<Awaited<ReturnType<typeof loadAllSessions>>>("sessions");
    if (!sessions) {
      sessions = await loadAllSessions();
      dataCache.set("sessions", sessions);
    }

    const cacheKey = "overview";
    let stats = dataCache.get<ReturnType<typeof buildOverviewStats>>(cacheKey);
    if (!stats) {
      stats = buildOverviewStats(sessions.map((s) => s.session));
      dataCache.set(cacheKey, stats);
    }

    res.json(stats);
  } catch (err) {
    console.error("Overview route error:", err);
    res.status(500).json({ error: "Failed to load overview stats" });
  }
});
