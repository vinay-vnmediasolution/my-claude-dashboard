import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { GlassCard } from "@/components/shared/GlassCard";
import { formatCost, formatTokens } from "@/lib/formatters";
import { MODEL_COLORS, MODEL_SHORT } from "@/lib/constants";
import type { ModelSummary } from "@/api/hooks/types";

interface ModelBreakdownProps {
  data: ModelSummary[];
  totalCost: number;
}

interface TooltipPayload {
  name: string;
  value: number;
  payload: ModelSummary;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f0f1a]/95 p-3 text-xs backdrop-blur">
      <div className="font-semibold text-white">
        {MODEL_SHORT[d.model] ?? d.model}
      </div>
      <div className="mt-1 text-white/60">{formatCost(d.cost)}</div>
      <div className="text-white/40">{formatTokens(d.outputTokens)} output</div>
      <div className="text-white/40">{d.sessions} sessions</div>
    </div>
  );
}

export function ModelBreakdown({ data, totalCost }: ModelBreakdownProps) {
  const chartData = data.map((m) => ({
    ...m,
    name: MODEL_SHORT[m.model] ?? m.model,
  }));

  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-white mb-1">Model Usage</h3>
      <p className="text-xs text-white/40 mb-4">by cost</p>
      <div className="relative">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              dataKey="cost"
              strokeWidth={0}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.model}
                  fill={MODEL_COLORS[entry.model] ?? MODEL_COLORS.unknown}
                  opacity={0.9}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-lg font-bold text-white">
            {formatCost(totalCost)}
          </div>
          <div className="text-xs text-white/40">total</div>
        </div>
      </div>
      {/* Legend */}
      <div className="mt-2 space-y-2">
        {data.map((m) => (
          <div
            key={m.model}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: MODEL_COLORS[m.model] ?? "#6b7280" }}
              />
              <span className="text-white/60">
                {MODEL_SHORT[m.model] ?? m.model}
              </span>
            </div>
            <span className="text-white/40">{formatCost(m.cost)}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
