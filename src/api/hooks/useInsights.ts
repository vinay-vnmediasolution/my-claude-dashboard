import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../client";
import type { InsightsData } from "./types";

export function useInsights() {
  return useQuery<InsightsData>({
    queryKey: ["insights"],
    queryFn: () => apiFetch<InsightsData>("/insights"),
    staleTime: 60_000,
  });
}
