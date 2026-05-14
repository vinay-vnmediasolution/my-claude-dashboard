import { BillingBadge } from "@/components/shared/BillingBadge";
import { formatCost } from "@/lib/formatters";
import type { BillingBreakdownEntry } from "@/api/hooks/types";

const SOURCE_LABEL: Record<string, string> = {
  api: "Direct API key — costs shown are real per-token charges",
  max: "Claude Max subscription — costs shown are API-equivalent estimates, not actual charges",
  pro: "Claude subscription — costs shown are API-equivalent estimates, not actual charges",
  free: "Free tier — costs shown are API-equivalent estimates, not actual charges",
  unknown: "Billing source could not be determined",
};

interface BillingSourceBarProps {
  data: BillingBreakdownEntry[];
}

export function BillingSourceBar({ data }: BillingSourceBarProps) {
  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.sessions, 0);
  const isSingleSource = data.length === 1;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-white/40 font-medium uppercase tracking-wider">
            Usage Source
          </span>
          {isSingleSource ? (
            <div className="flex items-center gap-2">
              <BillingBadge source={data[0].source} />
              <span className="text-xs text-white/40">
                {SOURCE_LABEL[data[0].source]}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-4 flex-wrap">
              {data.map((entry) => (
                <div key={entry.source} className="flex items-center gap-1.5">
                  <BillingBadge source={entry.source} />
                  <span className="text-xs text-white/50">
                    {entry.sessions} session{entry.sessions !== 1 ? "s" : ""} ·{" "}
                    {formatCost(entry.cost)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {isSingleSource && (
          <div className="flex items-center gap-6 text-xs text-white/40">
            <span>
              <span className="text-white/70 font-medium">{total}</span>{" "}
              sessions
            </span>
            <span>
              <span className="text-white/70 font-medium">
                {formatCost(data[0].cost)}
              </span>{" "}
              {data[0].source === "api" ? "billed" : "API-equivalent"}
            </span>
          </div>
        )}
      </div>

      {data.length > 1 && (
        <div className="mt-3 flex h-1.5 rounded-full overflow-hidden gap-px">
          {data.map((entry) => (
            <div
              key={entry.source}
              className="h-full rounded-full transition-all"
              style={{
                width: `${(entry.sessions / total) * 100}%`,
                background:
                  entry.source === "api"
                    ? "#10b981"
                    : entry.source === "max"
                      ? "#8b5cf6"
                      : entry.source === "pro"
                        ? "#6366f1"
                        : entry.source === "free"
                          ? "#f59e0b"
                          : "#64748b",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
