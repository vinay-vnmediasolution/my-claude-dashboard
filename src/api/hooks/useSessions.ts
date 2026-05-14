import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../client";
import type { SessionsResponse } from "./types";

interface SessionsParams {
  page?: number;
  limit?: number;
  project?: string;
  model?: string;
  from?: string;
  to?: string;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export function useSessions(params: SessionsParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.project) searchParams.set("project", params.project);
  if (params.model) searchParams.set("model", params.model);
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.search) searchParams.set("search", params.search);
  if (params.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params.sortDir) searchParams.set("sortDir", params.sortDir);

  const qs = searchParams.toString();

  return useQuery<SessionsResponse>({
    queryKey: ["sessions", params],
    queryFn: () => apiFetch<SessionsResponse>(`/sessions${qs ? `?${qs}` : ""}`),
    staleTime: 30_000,
  });
}
