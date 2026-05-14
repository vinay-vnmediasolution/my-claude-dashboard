import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { GlassCard } from "@/components/shared/GlassCard";
import { formatCost, formatHour } from "@/lib/formatters";
import type { HourlyEntry } from "@/api/hooks/types";

interface HourlyChartProps {
  data: HourlyEntry[];
}

interface TooltipPayload {
  payload: HourlyEntry;
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
      <div className="font-semibold text-white">{formatHour(d.hour)}</div>
      <div className="mt-1 text-white/60">{d.messages} messages</div>
      <div className="text-white/40">{formatCost(d.cost)} spend</div>
    </div>
  );
}

export function HourlyChart({ data }: HourlyChartProps) {
  const max = Math.max(...data.map((d) => d.messages), 1);
  const peakHour = data.reduce(
    (a, b) => (b.messages > a.messages ? b : a),
    data[0],
  );

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Usage by Hour</h3>
          <p className="text-xs text-white/40 mt-0.5">
            Peak at {formatHour(peakHour?.hour ?? 0)} ·{" "}
            {peakHour?.messages ?? 0} messages
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart
          data={data}
          barSize={8}
          margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
        >
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="hour"
            tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(h: number) => (h % 6 === 0 ? formatHour(h) : "")}
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar dataKey="messages" radius={[3, 3, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.hour}
                fill={
                  entry.messages === max
                    ? "url(#barGrad)"
                    : "rgba(99,102,241,0.35)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </GlassCard>
  );
}
