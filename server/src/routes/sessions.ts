import { Router } from "express";
import { getSessions } from "../utils/sessionCache.js";

export const sessionsRouter = Router();

sessionsRouter.get("/", async (req, res) => {
  try {
    const sessions = await getSessions();
    let items = sessions.map((s) => s.session);

    const { project, model, from, to, search } = req.query as Record<
      string,
      string | undefined
    >;

    if (project)
      items = items.filter(
        (s) =>
          s.projectPath.includes(project) || s.projectName.includes(project),
      );
    if (model)
      items = items.filter((s) => s.models.some((m) => m.includes(model)));
    if (from) items = items.filter((s) => s.startTime.slice(0, 10) >= from);
    if (to) items = items.filter((s) => s.startTime.slice(0, 10) <= to);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (s) =>
          s.projectName.toLowerCase().includes(q) ||
          (s.aiTitle ?? "").toLowerCase().includes(q) ||
          (s.firstUserMessage ?? "").toLowerCase().includes(q),
      );
    }

    const sortBy = (req.query.sortBy as string) ?? "startTime";
    const sortDir = (req.query.sortDir as string) ?? "desc";
    items.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      if (sortBy === "startTime") {
        aVal = a.startTime;
        bVal = b.startTime;
      } else if (sortBy === "cost") {
        aVal = a.estimatedCost;
        bVal = b.estimatedCost;
      } else if (sortBy === "messages") {
        aVal = a.userMessageCount;
        bVal = b.userMessageCount;
      } else if (sortBy === "duration") {
        aVal = a.durationMinutes;
        bVal = b.durationMinutes;
      }
      return sortDir === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
    });

    const page = parseInt((req.query.page as string) ?? "1", 10);
    const limit = parseInt((req.query.limit as string) ?? "50", 10);
    const start = (page - 1) * limit;
    const paginated = items.slice(start, start + limit);

    res.json({ sessions: paginated, total: items.length, page, limit });
  } catch (err) {
    console.error("Sessions route error:", err);
    res.status(500).json({ error: "Failed to load sessions" });
  }
});

sessionsRouter.get("/:sessionId", async (req, res) => {
  try {
    const sessions = await getSessions();
    const found = sessions.find(
      (s) => s.session.sessionId === req.params.sessionId,
    );
    if (!found) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json({ session: found.session, messages: found.messages });
  } catch (err) {
    console.error("Session detail route error:", err);
    res.status(500).json({ error: "Failed to load session" });
  }
});
