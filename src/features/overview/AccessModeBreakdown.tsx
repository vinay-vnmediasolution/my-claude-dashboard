import { GlassCard } from "@/components/shared/GlassCard";
import { formatCost } from "@/lib/formatters";
import type { AccessModeEntry } from "@/api/hooks/types";

const MODE_COLOR: Record<string, string> = {
  "claude-code": "#6366f1",
  "claude-code-sdk": "#818cf8",
  api: "#10b981",
  "claude-ai-pro": "#f59e0b",
  "claude-ai-max": "#8b5cf6",
  "claude-ai-free": "#64748b",
  unknown: "#334155",
};

interface AccessModeBreakdownProps {
  data: AccessModeEntry[];
}

export function AccessModeBreakdown({ data }: AccessModeBreakdownProps) {
  if (data.length === 0) return null;

  const totalSessions = data.reduce((s, d) => s + d.sessions, 0);

  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-white mb-4">
        Usage by Access Mode
      </h3>

      <div className="space-y-3">
        {data.map((entry) => {
          const color = MODE_COLOR[entry.mode] ?? MODE_COLOR.unknown;
          const pct = Math.round((entry.sessions / totalSessions) * 100);

          return (
            <div key={entry.mode}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-white/85">
                      {entry.label}
                    </span>
                    <span className="ml-2 text-xs text-white/35 hidden sm:inline">
                      {entry.description}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-3 text-xs">
                  <span className="text-white/40">
                    {entry.sessions} session{entry.sessions !== 1 ? "s" : ""}
                  </span>
                  <span className="text-white/40">{entry.messages} msgs</span>
                  <span className="font-medium text-white/70 w-16 text-right">
                    {formatCost(entry.cost)}
                  </span>
                  <span className="w-8 text-right font-mono" style={{ color }}>
                    {pct}%
                  </span>
                </div>
              </div>
              <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-white/25 leading-relaxed">
        Detected from session entrypoint and billing source. Claude.ai Pro/Max
        costs are API-equivalent estimates — not actual subscription charges.
      </p>
    </GlassCard>
  );
}
