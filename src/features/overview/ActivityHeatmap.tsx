import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  format,
  parseISO,
  startOfWeek,
  eachDayOfInterval,
  subDays,
} from "date-fns";
import { getHeatmapColor } from "@/lib/colorScale";
import { GlassCard } from "@/components/shared/GlassCard";
import type { HeatmapEntry } from "@/api/hooks/types";

interface ActivityHeatmapProps {
  data: HeatmapEntry[];
}

const DAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    date: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  const { weeks, max, monthLabels } = useMemo(() => {
    const lookup = new Map(data.map((d) => [d.date, d.count]));
    const today = new Date();
    const start = startOfWeek(subDays(today, 364), { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start, end: today });
    const maxVal = Math.max(...data.map((d) => d.count), 1);

    const weeksArr: Array<Array<{ date: string; count: number }>> = [];
    let week: Array<{ date: string; count: number }> = [];

    days.forEach((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      week.push({ date: dateStr, count: lookup.get(dateStr) ?? 0 });
      if (week.length === 7) {
        weeksArr.push(week);
        week = [];
      }
    });
    if (week.length > 0) weeksArr.push(week);

    // Month label for first week of each month
    const labels: Array<{ weekIdx: number; label: string }> = [];
    weeksArr.forEach((w, i) => {
      if (w[0]) {
        const d = parseISO(w[0].date);
        if (d.getDate() <= 7) {
          labels.push({ weekIdx: i, label: format(d, "MMM") });
        }
      }
    });

    return { weeks: weeksArr, max: maxVal, monthLabels: labels };
  }, [data]);

  const totalMessages = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <GlassCard className="relative overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Activity</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {totalMessages.toLocaleString()} messages · last 365 days
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <span>Less</span>
          {["#1a1a2e", "#312e81", "#4338ca", "#6366f1", "#a5b4fc"].map((c) => (
            <div
              key={c}
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: c }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex mb-1 ml-8 gap-[2px]">
            {weeks.map((_, i) => {
              const label = monthLabels.find((l) => l.weekIdx === i);
              return (
                <div
                  key={i}
                  className="w-[12px] shrink-0 text-[9px] text-white/30"
                >
                  {label?.label ?? ""}
                </div>
              );
            })}
          </div>

          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-[2px] mr-1">
              {DAYS.map((d, i) => (
                <div
                  key={i}
                  className="h-[12px] text-[9px] text-white/30 flex items-center"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Grid */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[2px]">
                {week.map((cell, di) => (
                  <motion.div
                    key={cell.date}
                    className="h-[12px] w-[12px] rounded-sm cursor-pointer"
                    style={{
                      backgroundColor: getHeatmapColor(cell.count, max),
                    }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.15,
                      delay: Math.min((wi * 7 + di) * 0.001, 0.4),
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({ ...cell, x: rect.left, y: rect.top });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 rounded-lg border border-white/10 bg-[#0f0f1a]/95 px-3 py-2 text-xs text-white/80 pointer-events-none backdrop-blur"
          style={{ top: tooltip.y - 40, left: tooltip.x + 14 }}
        >
          <span className="font-medium">{tooltip.count} messages</span>
          <span className="text-white/40 ml-2">
            {format(parseISO(tooltip.date), "MMM d, yyyy")}
          </span>
        </div>
      )}
    </GlassCard>
  );
}
