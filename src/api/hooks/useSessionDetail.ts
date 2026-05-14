import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../client";
import type { SessionDetailResponse } from "./types";

export function useSessionDetail(sessionId: string | undefined) {
  return useQuery<SessionDetailResponse>({
    queryKey: ["session", sessionId],
    queryFn: () => apiFetch<SessionDetailResponse>(`/sessions/${sessionId}`),
    enabled: !!sessionId,
    staleTime: 60_000,
  });
}
