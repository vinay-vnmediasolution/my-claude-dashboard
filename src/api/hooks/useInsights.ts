import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../client";
import { queryKeys } from "../queryKeys";
import type { InsightsData } from "./types";

export function useInsights() {
  return useQuery<InsightsData>({
    queryKey: queryKeys.insights(),
    queryFn: () => apiFetch<InsightsData>("/insights"),
  });
}
