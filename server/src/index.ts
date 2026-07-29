import express from "express";
import cors from "cors";
import { PORT, CLAUDE_DIR } from "./config.js";
import { dataCache } from "./cache/dataCache.js";
import type { LoadedSession } from "./types/index.js";
import { overviewRouter } from "./routes/overview.js";
import { sessionsRouter } from "./routes/sessions.js";
import { analyticsRouter } from "./routes/analytics.js";
import { insightsRouter } from "./routes/insights.js";

const app = express();

app.use(cors({ origin: ["http://localhost:5173", "http://localhost:4173"] }));
app.use(express.json());

app.use("/api/overview", overviewRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/insights", insightsRouter);

app.get("/api/health", async (_req, res) => {
  const cached = dataCache.get<LoadedSession[]>("sessions");
  const sessionCount = cached?.length ?? null;
  const lastParsed = dataCache.lastSet("sessions");
  res.json({
    status: "ok",
    claudeDir: CLAUDE_DIR,
    sessionCount,
    lastParsed: lastParsed?.toISOString() ?? null,
  });
});

app.post("/api/cache/invalidate", (_req, res) => {
  dataCache.invalidate();
  res.json({
    success: true,
    message: "Cache cleared — next request will re-parse all sessions",
  });
});

app.listen(PORT, () => {
  console.log(`Claude Dashboard server running on http://localhost:${PORT}`);
  console.log(`Reading Claude data from: ${CLAUDE_DIR}`);
});
