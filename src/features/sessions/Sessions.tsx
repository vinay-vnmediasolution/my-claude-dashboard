import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSessions } from "@/api/hooks/useSessions";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { ModelBadge } from "@/components/shared/ModelBadge";
import { BillingBadge } from "@/components/shared/BillingBadge";
import {
  formatCost,
  formatRelativeTime,
  formatDuration,
  formatTokens,
  truncate,
} from "@/lib/formatters";
import type { SessionData } from "@/api/hooks/types";

type SortKey = "startTime" | "cost" | "messages" | "duration";

export function Sessions() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("startTime");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data, isLoading } = useSessions({
    page,
    limit: 50,
    search: search || undefined,
    sortBy,
    sortDir,
  });

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortBy !== col) return <span className="opacity-20">↕</span>;
    return sortDir === "desc" ? (
      <ChevronDown size={12} className="inline" />
    ) : (
      <ChevronUp size={12} className="inline" />
    );
  }

  const totalPages = data ? Math.ceil(data.total / 50) : 1;

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Sessions
          </h1>
          <p className="text-sm text-white/40 mt-1">
            {data?.total ?? "…"} total sessions
          </p>
        </div>
        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            className="w-64 rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none focus:bg-white/[0.06] transition-all"
            placeholder="Search sessions…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : (
        <>
          <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-white/[0.02]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {[
                    { label: "Project / Title", col: null },
                    { label: "Date", col: "startTime" as SortKey },
                    { label: "Duration", col: "duration" as SortKey },
                    { label: "Messages", col: "messages" as SortKey },
                    { label: "Tokens", col: null },
                    { label: "Cost", col: "cost" as SortKey },
                    { label: "Model", col: null },
                    { label: "Source", col: null },
                  ].map(({ label, col }) => (
                    <th
                      key={label}
                      className={`px-4 py-3 text-left text-xs font-medium text-white/40 ${col ? "cursor-pointer hover:text-white/70 transition-colors select-none" : ""}`}
                      onClick={() => col && toggleSort(col)}
                    >
                      {label} {col && <SortIcon col={col} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.sessions.map((session, i) => (
                  <SessionRow
                    key={session.sessionId}
                    session={session}
                    i={i}
                    onClick={() => navigate(`/sessions/${session.sessionId}`)}
                  />
                ))}
              </tbody>
            </table>
            {data?.sessions.length === 0 && (
              <div className="py-16 text-center text-white/30 text-sm">
                No sessions found
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-white/40">
              <span>
                Page {page} of {totalPages} · {data?.total} sessions
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/[0.05] disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={12} />
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/[0.05] disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SessionRow({
  session,
  i,
  onClick,
}: {
  session: SessionData;
  i: number;
  onClick: () => void;
}) {
  const title =
    session.aiTitle ??
    (session.firstUserMessage
      ? truncate(session.firstUserMessage, 55)
      : "Untitled session");

  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: i * 0.012 }}
      onClick={onClick}
      className="border-b border-white/[0.04] hover:bg-white/[0.04] cursor-pointer transition-colors group"
    >
      <td className="px-4 py-3 max-w-[260px]">
        <div className="text-white/80 font-medium text-sm truncate group-hover:text-white transition-colors">
          {title}
        </div>
        <div className="text-xs text-white/35 mt-0.5 truncate">
          {session.projectName}
        </div>
      </td>
      <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">
        {formatRelativeTime(session.startTime)}
      </td>
      <td className="px-4 py-3 text-white/40 text-xs">
        {formatDuration(session.durationMinutes)}
      </td>
      <td className="px-4 py-3 text-white/60 text-xs">
        {session.userMessageCount}
      </td>
      <td className="px-4 py-3 text-white/40 text-xs">
        {formatTokens(session.totalOutputTokens)}
      </td>
      <td className="px-4 py-3 text-xs font-medium text-white/70">
        {formatCost(session.estimatedCost)}
      </td>
      <td className="px-4 py-3">
        {session.models[0] && <ModelBadge model={session.models[0]} />}
      </td>
      <td className="px-4 py-3">
        <BillingBadge source={session.billingSource} />
      </td>
    </motion.tr>
  );
}
