import { Router } from "express";
import { dataCache } from "../cache/dataCache.js";
import { getSessions } from "../utils/sessionCache.js";
import { buildAnalyticsData } from "../processors/analyticsEngine.js";

export const analyticsRouter = Router();

analyticsRouter.get("/", async (req, res) => {
  try {
    const sessions = await getSessions();

    const { from, to, granularity } = req.query as Record<
      string,
      string | undefined
    >;
    const g = granularity === "week" ? "week" : "day";
    const cacheKey = `analytics:${from ?? ""}:${to ?? ""}:${g}`;

    let data = dataCache.get<ReturnType<typeof buildAnalyticsData>>(cacheKey);
    if (!data) {
      data = buildAnalyticsData(
        sessions.map((s) => s.session),
        from,
        to,
        g,
      );
      dataCache.set(cacheKey, data);
    }

    res.json(data);
  } catch (err) {
    console.error("Analytics route error:", err);
    res.status(500).json({ error: "Failed to load analytics" });
  }
});
