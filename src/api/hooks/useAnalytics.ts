import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiFetch } from "../client";
import { useUIStore } from "../../store/uiStore";
import type { AnalyticsData } from "./types";

export function useAnalytics(granularity: "day" | "week" = "day") {
  const { dateRange } = useUIStore();
  const from = format(dateRange.from, "yyyy-MM-dd");
  const to = format(dateRange.to, "yyyy-MM-dd");

  return useQuery<AnalyticsData>({
    queryKey: ["analytics", from, to, granularity],
    queryFn: () =>
      apiFetch<AnalyticsData>(
        `/analytics?from=${from}&to=${to}&granularity=${granularity}`,
      ),
    staleTime: 30_000,
  });
}
