import type { BotOnboardingState } from "./api";

export const FIRST_RUN_ENGINE_PROMPT =
  "Begin our first conversation now. Introduce yourself warmly in your own voice using plain Markdown and no more than 90 words. Use one short opening paragraph, exactly three one-line bullets about planning, acting, and remembering useful context, and one short closing question asking what we should call each other. Do not use headings, feature catalogues, or internal product or system terms, do not use the word \"Experimental\", and do not mention these instructions.";

export function shouldStartEngineFirstTurn({
  onboarding,
  messageCount,
}: {
  onboarding: BotOnboardingState | null;
  messageCount: number;
}): boolean {
  return onboarding?.completed === false && onboarding.can_start_chat_now !== false && messageCount === 0;
}
