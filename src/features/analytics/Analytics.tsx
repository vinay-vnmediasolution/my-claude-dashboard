import { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import { useAnalytics } from "@/api/hooks/useAnalytics";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { GlassCard } from "@/components/shared/GlassCard";
import { formatCost, formatTokens, formatDate } from "@/lib/formatters";
import { TOOL_CATEGORIES, TOOL_CATEGORY_COLORS } from "@/lib/constants";

export function Analytics() {
  const [granularity, setGranularity] = useState<"day" | "week">("day");
  const { data, isLoading } = useAnalytics(granularity);

  if (isLoading) return <PageLoader />;
  if (!data) return <div className="p-8 text-white/40">No analytics data</div>;

  const cachePct = Math.round(data.cacheMetrics.hitRate * 100);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Analytics
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Token usage, costs, and tool patterns
          </p>
        </div>
        <div className="flex rounded-xl border border-white/10 overflow-hidden text-xs">
          {(["day", "week"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-4 py-2 capitalize transition-colors ${granularity === g ? "bg-indigo-500/20 text-indigo-300" : "text-white/40 hover:text-white/60"}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Cache savings hero */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GlassCard className="p-4 text-center" glow>
          <div className="text-2xl font-bold text-cyan-400">{cachePct}%</div>
          <div className="text-xs text-white/40 mt-1">Cache hit rate</div>
        </GlassCard>
        <GlassCard className="p-4 text-center" glow>
          <div className="text-2xl font-bold text-emerald-400">
            {formatCost(data.cacheMetrics.savingsUSD)}
          </div>
          <div className="text-xs text-white/40 mt-1">Saved by caching</div>
        </GlassCard>
        <GlassCard className="p-4 text-center" glow>
          <div className="text-2xl font-bold text-violet-400">
            {formatTokens(data.cacheMetrics.totalCacheRead)}
          </div>
          <div className="text-xs text-white/40 mt-1">Cache read tokens</div>
        </GlassCard>
      </div>

      {/* Token timeline */}
      <GlassCard>
        <h3 className="text-sm font-semibold text-white mb-1">
          Token Usage Over Time
        </h3>
        <p className="text-xs text-white/40 mb-5">Stacked by token type</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={data.tokenTimeline}
            margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
          >
            <defs>
              {[
                { id: "aInput", color: "#6366f1" },
                { id: "aOutput", color: "#8b5cf6" },
                { id: "aCacheCreate", color: "#06b6d4" },
                { id: "aCacheRead", color: "#10b981" },
              ].map(({ id, color }) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(d: string) => formatDate(d, "MMM d")}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatTokens(v)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-xl border border-white/10 bg-[#0f0f1a]/95 p-3 text-xs backdrop-blur space-y-1">
                    <div className="font-semibold text-white mb-2">
                      {formatDate(label as string, "MMM d, yyyy")}
                    </div>
                    {payload.map((p) => (
                      <div
                        key={p.dataKey as string}
                        className="flex justify-between gap-4"
                      >
                        <span style={{ color: p.color as string }}>
                          {p.name}
                        </span>
                        <span className="text-white/60">
                          {formatTokens(p.value as number)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="cacheRead"
              name="Cache read"
              stackId="1"
              stroke="#10b981"
              fill="url(#aCacheRead)"
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="cacheCreate"
              name="Cache write"
              stackId="1"
              stroke="#06b6d4"
              fill="url(#aCacheCreate)"
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="output"
              name="Output"
              stackId="1"
              stroke="#8b5cf6"
              fill="url(#aOutput)"
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="input"
              name="Input"
              stackId="1"
              stroke="#6366f1"
              fill="url(#aInput)"
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tool usage */}
        <GlassCard>
          <h3 className="text-sm font-semibold text-white mb-5">Tool Usage</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={data.toolBreakdown.slice(0, 10)}
              layout="vertical"
              margin={{ top: 0, right: 60, left: 10, bottom: 0 }}
              barSize={10}
            >
              <XAxis
                type="number"
                tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="tool"
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload as {
                    tool: string;
                    count: number;
                    pct: number;
                  };
                  return (
                    <div className="rounded-xl border border-white/10 bg-[#0f0f1a]/95 p-3 text-xs backdrop-blur">
                      <div className="font-semibold text-white">{d.tool}</div>
                      <div className="text-white/60 mt-1">
                        {d.count.toLocaleString()} calls · {d.pct}%
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.toolBreakdown.slice(0, 10).map((entry) => {
                  const cat = TOOL_CATEGORIES[entry.tool] ?? "default";
                  return (
                    <Cell
                      key={entry.tool}
                      fill={TOOL_CATEGORY_COLORS[cat] ?? "#6b7280"}
                      opacity={0.8}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Cache radial */}
        <GlassCard className="flex flex-col">
          <h3 className="text-sm font-semibold text-white mb-1">
            Prompt Cache
          </h3>
          <p className="text-xs text-white/40 mb-2">Efficiency & savings</p>
          <div className="relative flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="85%"
                data={[{ value: cachePct }]}
                startAngle={220}
                endAngle={-40}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar
                  dataKey="value"
                  cornerRadius={8}
                  fill="#06b6d4"
                  background={{ fill: "rgba(255,255,255,0.04)" }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-3xl font-bold text-cyan-400">
                {cachePct}%
              </div>
              <div className="text-xs text-white/40">hit rate</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-xl bg-white/[0.04] p-3 text-center">
              <div className="text-sm font-semibold text-emerald-400">
                {formatCost(data.cacheMetrics.savingsUSD)}
              </div>
              <div className="text-[10px] text-white/35 mt-0.5">saved</div>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3 text-center">
              <div className="text-sm font-semibold text-white/70">
                {formatTokens(data.cacheMetrics.totalCacheCreate)}
              </div>
              <div className="text-[10px] text-white/35 mt-0.5">
                cache writes
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Cost by project */}
      {data.costByProject.length > 0 && (
        <GlassCard>
          <h3 className="text-sm font-semibold text-white mb-5">
            Cost by Project
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={data.costByProject.slice(0, 8)}
              margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
              barSize={20}
            >
              <XAxis
                dataKey="project"
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatCost(v)}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload as {
                    project: string;
                    cost: number;
                  };
                  return (
                    <div className="rounded-xl border border-white/10 bg-[#0f0f1a]/95 p-3 text-xs backdrop-blur">
                      <div className="font-semibold text-white">
                        {d.project}
                      </div>
                      <div className="text-white/60 mt-1">
                        {formatCost(d.cost)}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="cost"
                radius={[4, 4, 0, 0]}
                fill="#6366f1"
                opacity={0.8}
              />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}
    </div>
  );
}
