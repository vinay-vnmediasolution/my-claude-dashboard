import { motion } from "framer-motion";
import {
  Moon,
  Flame,
  DollarSign,
  Wrench,
  Trophy,
  Clock,
  MessageSquare,
  Calendar,
  Zap,
} from "lucide-react";
import { useInsights } from "@/api/hooks/useInsights";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { GlassCard } from "@/components/shared/GlassCard";
import { formatCost, formatDuration, formatHour } from "@/lib/formatters";
import { TOOL_CATEGORIES, TOOL_CATEGORY_COLORS } from "@/lib/constants";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export function Insights() {
  const { data, isLoading } = useInsights();

  if (isLoading) return <PageLoader />;
  if (!data)
    return <div className="p-8 text-white/40">No insights available</div>;

  const peakHour = data.peakHours[0];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Insights
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Patterns and discoveries from your Claude usage
        </p>
      </div>

      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Peak hours */}
        <motion.div variants={item}>
          <GlassCard hover className="h-full">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/20">
                <Moon size={16} className="text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Peak Hours</h3>
                <p className="text-xs text-white/40 mt-0.5">
                  When you code the most
                </p>
              </div>
            </div>
            {peakHour && (
              <div className="mb-3">
                <div className="text-2xl font-bold text-white">
                  {formatHour(peakHour.hour)}
                </div>
                <div className="text-xs text-white/40 mt-0.5">
                  {peakHour.score} messages in this hour
                </div>
              </div>
            )}
            <div className="space-y-2 mt-3">
              {data.peakHours.map((h, i) => (
                <div key={h.hour} className="flex items-center gap-3">
                  <span className="text-xs text-white/30 w-5">{i + 1}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                      style={{
                        width: `${(h.score / (data.peakHours[0]?.score ?? 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-white/50 w-12 text-right">
                    {formatHour(h.hour)}
                  </span>
                  <span className="text-xs text-white/30 w-8 text-right">
                    {h.score}
                  </span>
                </div>
              ))}
            </div>
            {peakHour && peakHour.hour < 6 && (
              <div className="mt-4 rounded-xl bg-violet-500/[0.08] border border-violet-500/15 p-3 text-xs text-violet-300/70">
                Night owl detected — you do your best work past midnight 🌙
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Streaks */}
        <motion.div variants={item}>
          <GlassCard hover className="h-full">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 border border-orange-500/20">
                <Flame size={16} className="text-orange-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Activity Streaks
                </h3>
                <p className="text-xs text-white/40 mt-0.5">
                  Consecutive coding days
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.04] p-4 text-center">
                <div className="text-3xl font-bold text-orange-400">
                  {data.currentStreak}
                </div>
                <div className="text-xs text-white/40 mt-1">current streak</div>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-4 text-center">
                <div className="text-3xl font-bold text-white/60">
                  {data.longestStreak}
                </div>
                <div className="text-xs text-white/40 mt-1">longest streak</div>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between text-white/50">
                <span>Total active days</span>
                <span className="text-white/70 font-medium">
                  {data.totalActiveDays}
                </span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>Most productive day</span>
                <span className="text-white/70 font-medium">
                  {data.mostProductiveDay}
                </span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Cache savings */}
        <motion.div variants={item}>
          <GlassCard hover className="h-full" glow>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/20">
                <DollarSign size={16} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Cache Savings
                </h3>
                <p className="text-xs text-white/40 mt-0.5">
                  Money saved by prompt caching
                </p>
              </div>
            </div>
            <div className="text-4xl font-bold text-emerald-400 mb-1">
              {formatCost(data.cacheSavingsUSD)}
            </div>
            <div className="text-xs text-white/40 mb-4">
              vs paying full input token price
            </div>
            <div className="rounded-xl bg-emerald-500/[0.08] border border-emerald-500/15 p-3 text-xs text-emerald-300/70">
              Prompt caching reduces costs on long conversations. You&apos;ve
              saved {formatCost(data.cacheSavingsUSD)} vs paying full input
              token prices.
            </div>
          </GlassCard>
        </motion.div>

        {/* Tool frequency */}
        <motion.div variants={item}>
          <GlassCard hover className="h-full">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/20">
                <Wrench size={16} className="text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Tool Usage</h3>
                <p className="text-xs text-white/40 mt-0.5">
                  Most-used Claude tools
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {data.mostUsedTools.map((t, i) => {
                const cat = TOOL_CATEGORIES[t.tool] ?? "default";
                const color = TOOL_CATEGORY_COLORS[cat] ?? "#6b7280";
                return (
                  <div key={t.tool}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/25 w-4">
                          {i + 1}
                        </span>
                        <span className="text-xs text-white/70 font-medium">
                          {t.tool}
                        </span>
                        {t.errors > 0 && (
                          <span
                            className="text-[10px] text-amber-300/80"
                            title={`${t.errors} of ${t.count} calls failed`}
                          >
                            {(t.errorRate * 100).toFixed(0)}% failed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/35">
                          {t.count.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-white/20">
                          {t.pct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${t.pct}%`,
                          backgroundColor: color,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>

        {/* Session stats */}
        <motion.div variants={item}>
          <GlassCard hover className="h-full">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/20">
                <Clock size={16} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Session Patterns
                </h3>
                <p className="text-xs text-white/40 mt-0.5">
                  How you work with Claude
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/[0.04] p-3 text-center">
                  <div className="text-xl font-bold text-white">
                    {formatDuration(data.averageSessionDuration)}
                  </div>
                  <div className="text-[10px] text-white/35 mt-1">
                    avg duration
                  </div>
                </div>
                <div className="rounded-xl bg-white/[0.04] p-3 text-center">
                  <div className="text-xl font-bold text-white">
                    {data.averageMessagesPerSession}
                  </div>
                  <div className="text-[10px] text-white/35 mt-1">
                    avg messages
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-white/50">
                  <span>Longest session</span>
                  <span className="text-white/70">
                    {formatDuration(data.longestSession.durationMinutes)}
                  </span>
                </div>
                <div className="flex justify-between text-white/50">
                  <span>Most expensive</span>
                  <span className="text-white/70">
                    {formatCost(data.mostExpensiveSession.cost)}
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Favorite projects */}
        <motion.div variants={item}>
          <GlassCard hover className="h-full">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-500/15 border border-yellow-500/20">
                <Trophy size={16} className="text-yellow-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Top Projects
                </h3>
                <p className="text-xs text-white/40 mt-0.5">By session count</p>
              </div>
            </div>
            <div className="space-y-3">
              {data.favoriteProjects.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-xs text-white/25 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white/70 font-medium truncate">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-white/30">
                      {p.sessions} sessions · {formatCost(p.totalCost)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Skills used */}
        {data.skillsUsed.length > 0 && (
          <motion.div variants={item} className="sm:col-span-2 xl:col-span-3">
            <GlassCard hover>
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/20">
                  <Zap size={16} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Experiments & Features
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5">
                    Claude skills and superpowers you've used
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.skillsUsed.map((s) => (
                  <div
                    key={s.skill}
                    className="flex items-center gap-2 rounded-full px-3 py-1.5 border border-violet-500/20 bg-violet-500/[0.08]"
                  >
                    <span className="text-xs text-violet-300 font-medium">
                      {s.skill}
                    </span>
                    <span className="text-[10px] text-violet-400/50 bg-violet-500/20 rounded-full px-1.5 py-0.5">
                      {s.count}×
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Stats banner */}
        <motion.div variants={item} className="sm:col-span-2 xl:col-span-3">
          <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.07] to-violet-500/[0.04] p-6">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {[
                {
                  icon: MessageSquare,
                  label: "Messages sent",
                  value: String(
                    data.averageMessagesPerSession * data.totalActiveDays,
                  ),
                },
                {
                  icon: Calendar,
                  label: "Active days",
                  value: String(data.totalActiveDays),
                },
                {
                  icon: Flame,
                  label: "Best streak",
                  value: `${data.longestStreak}d`,
                },
                {
                  icon: Clock,
                  label: "Avg session",
                  value: formatDuration(data.averageSessionDuration),
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="text-center">
                  <Icon size={20} className="mx-auto mb-2 text-indigo-400/60" />
                  <div className="text-xl font-bold text-white">{value}</div>
                  <div className="text-xs text-white/35 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
