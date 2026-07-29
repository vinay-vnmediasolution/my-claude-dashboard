import { useOverview } from "@/api/hooks/useOverview";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { formatDate } from "@/lib/formatters";
import { HeroStats } from "./HeroStats";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { HourlyChart } from "./HourlyChart";
import { TopProjects } from "./TopProjects";
import { ModelBreakdown } from "./ModelBreakdown";
import { BillingSourceBar } from "./BillingSourceBar";
import { AccessModeBreakdown } from "./AccessModeBreakdown";

export function Overview() {
  const { data, isLoading, error } = useOverview();

  if (isLoading) return <PageLoader />;
  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <p className="text-white/50 mb-2">Could not load overview data</p>
          <p className="text-xs text-white/25">
            Make sure the server is running on port 3001
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Overview
        </h1>
        <p className="text-sm text-white/40 mt-1">
          {data.coverage.missingTranscripts > 0
            ? "Retained usage"
            : "All-time usage"}{" "}
          · {data.totalSessions} sessions across {data.topProjects.length}{" "}
          projects
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {data.providers
            .filter((p) => p.available)
            .map((p) => (
              <span
                key={p.id}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50"
              >
                {p.label}
                <span className="ml-1.5 text-white/30">{p.sessions}</span>
              </span>
            ))}
        </div>
      </div>

      {data.coverage.missingTranscripts > 0 && (
        <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3">
          <p className="text-sm font-medium text-sky-200">
            Showing {data.coverage.sessionsWithTranscript} of{" "}
            {data.coverage.knownSessions} known Claude Code sessions —{" "}
            {data.coverage.missingTranscripts} transcripts have been deleted
          </p>
          <p className="mt-1 text-xs text-sky-200/70">
            Claude Code removes transcripts after{" "}
            <code className="text-sky-200/90">cleanupPeriodDays</code> (30 by
            default), so totals below cover roughly the last month rather than
            all time. Your prompt history goes back to{" "}
            {formatDate(data.coverage.historyStart, "MMM d, yyyy")}, but the
            earliest surviving transcript is{" "}
            {formatDate(
              data.coverage.earliestSurvivingTranscript,
              "MMM d, yyyy",
            )}
            . {data.coverage.missingProjects.length} projects have no surviving
            transcript at all. Cost for deleted sessions is unrecoverable —
            history records prompts only, not token usage.
          </p>
        </div>
      )}

      {data.unpricedModels.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-sm font-medium text-amber-200">
            Costs are understated for {data.unpricedModels.length} unpriced{" "}
            {data.unpricedModels.length === 1 ? "model" : "models"}
          </p>
          <p className="mt-1 text-xs text-amber-200/70">
            {data.unpricedModels.join(", ")} — no entry in MODEL_PRICING.
            Unrecognised Claude models fall back to Sonnet rates; Codex models
            are reported at $0 rather than guessed, so their tokens are counted
            but their spend is not. Add{" "}
            {data.unpricedModels.length === 1 ? "an entry" : "entries"} to
            MODEL_PRICING in server/src/config.ts to price them.
          </p>
        </div>
      )}

      <HeroStats data={data} />

      <BillingSourceBar data={data.billingBreakdown} />

      <ActivityHeatmap data={data.heatmapData} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <HourlyChart data={data.hourlyData} />
        <ModelBreakdown data={data.modelBreakdown} totalCost={data.totalCost} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopProjects data={data.topProjects} />
        <AccessModeBreakdown data={data.accessModeBreakdown} />
      </div>
    </div>
  );
}
