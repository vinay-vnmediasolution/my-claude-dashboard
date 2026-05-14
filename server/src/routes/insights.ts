import { Router } from "express";
import { dataCache } from "../cache/dataCache.js";
import { loadAllSessions } from "../processors/sessionAggregator.js";
import { buildInsightsData } from "../processors/analyticsEngine.js";

export const insightsRouter = Router();

insightsRouter.get("/", async (_req, res) => {
  try {
    let sessions =
      dataCache.get<Awaited<ReturnType<typeof loadAllSessions>>>("sessions");
    if (!sessions) {
      sessions = await loadAllSessions();
      dataCache.set("sessions", sessions);
    }

    const cacheKey = "insights";
    let data = dataCache.get<ReturnType<typeof buildInsightsData>>(cacheKey);
    if (!data) {
      data = buildInsightsData(sessions.map((s) => s.session));
      dataCache.set(cacheKey, data);
    }

    res.json(data);
  } catch (err) {
    console.error("Insights route error:", err);
    res.status(500).json({ error: "Failed to load insights" });
  }
});
