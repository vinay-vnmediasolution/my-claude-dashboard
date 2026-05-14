import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../client";
import { queryKeys } from "../queryKeys";
import type { OverviewStats } from "./types";

export function useOverview() {
  return useQuery<OverviewStats>({
    queryKey: queryKeys.overview(),
    queryFn: () => apiFetch<OverviewStats>("/overview"),
  });
}
