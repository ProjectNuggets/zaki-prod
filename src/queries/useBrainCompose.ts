import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  postBrainCompose,
  type BrainComposeRequest,
  type BrainComposeResponse,
} from "@/lib/api";

export function useBrainCompose(userId: string) {
  const qc = useQueryClient();
  return useMutation<BrainComposeResponse, Error, BrainComposeRequest>({
    mutationFn: (body) => postBrainCompose(userId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brain", "graph", userId] });
      qc.invalidateQueries({ queryKey: ["brain", "timeline", userId] });
    },
  });
}
