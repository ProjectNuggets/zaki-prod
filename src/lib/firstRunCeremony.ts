import type { BotOnboardingState } from "./api";

export const FIRST_RUN_ENGINE_PROMPT =
  "Begin our first conversation now. Introduce yourself warmly in your own voice, then ask what we should call each other.";

export function shouldStartEngineFirstTurn({
  onboarding,
  messageCount,
}: {
  onboarding: BotOnboardingState | null;
  messageCount: number;
}): boolean {
  return onboarding?.completed === false && onboarding.can_start_chat_now !== false && messageCount === 0;
}
