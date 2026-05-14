import { Routes, Route, Navigate } from "react-router-dom";
import { Shell } from "./components/layout/Shell";
import { Overview } from "./features/overview/Overview";
import { Sessions } from "./features/sessions/Sessions";
import { SessionDetail } from "./features/session-detail/SessionDetail";
import { Analytics } from "./features/analytics/Analytics";
import { Insights } from "./features/insights/Insights";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Shell />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="sessions/:sessionId" element={<SessionDetail />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="insights" element={<Insights />} />
      </Route>
    </Routes>
  );
}
