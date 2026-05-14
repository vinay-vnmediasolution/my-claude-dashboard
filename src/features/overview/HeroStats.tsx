import { DollarSign, MessageSquare, Calendar, Layers } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { formatCost, formatTokens, formatDate } from "@/lib/formatters";
import type { OverviewStats } from "@/api/hooks/types";

interface HeroStatsProps {
  data: OverviewStats;
}

export function HeroStats({ data }: HeroStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total Sessions"
        value={String(data.totalSessions)}
        subValue={`${data.activeDays} active days`}
        icon={Layers}
        iconColor="#6366f1"
        delay={0}
      />
      <StatCard
        label="User Messages"
        value={String(data.totalUserMessages)}
        subValue={`${data.totalAssistantMessages} responses`}
        icon={MessageSquare}
        iconColor="#8b5cf6"
        delay={0.06}
      />
      <StatCard
        label="Total Cost"
        value={formatCost(data.totalCost)}
        subValue={`${formatTokens(data.totalOutputTokens)} output tokens`}
        icon={DollarSign}
        iconColor="#06b6d4"
        delay={0.12}
      />
      <StatCard
        label="Active Since"
        value={formatDate(data.firstSessionDate, "MMM d")}
        subValue={`${Math.round(data.cacheHitRate * 100)}% cache hit rate`}
        icon={Calendar}
        iconColor="#10b981"
        delay={0.18}
      />
    </div>
  );
}
