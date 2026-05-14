import { useOverview } from "@/api/hooks/useOverview";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { HeroStats } from "./HeroStats";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { HourlyChart } from "./HourlyChart";
import { TopProjects } from "./TopProjects";
import { ModelBreakdown } from "./ModelBreakdown";
import { BillingSourceBar } from "./BillingSourceBar";

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
          All-time Claude usage · {data.totalSessions} sessions across{" "}
          {data.topProjects.length} projects
        </p>
      </div>

      <HeroStats data={data} />

      <BillingSourceBar data={data.billingBreakdown} />

      <ActivityHeatmap data={data.heatmapData} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <HourlyChart data={data.hourlyData} />
        <ModelBreakdown data={data.modelBreakdown} totalCost={data.totalCost} />
      </div>

      <TopProjects data={data.topProjects} />
    </div>
  );
}
