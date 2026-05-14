import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../client";
import type { OverviewStats } from "./types";

export function useOverview() {
  return useQuery<OverviewStats>({
    queryKey: ["overview"],
    queryFn: () => apiFetch<OverviewStats>("/overview"),
    staleTime: 30_000,
  });
}
