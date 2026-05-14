import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../client";
import { queryKeys } from "../queryKeys";
import type { SessionDetailResponse } from "./types";

export function useSessionDetail(sessionId: string | undefined) {
  return useQuery<SessionDetailResponse>({
    queryKey: queryKeys.session(sessionId),
    queryFn: () => apiFetch<SessionDetailResponse>(`/sessions/${sessionId}`),
    enabled: !!sessionId,
  });
}
