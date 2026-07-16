import type { BotOnboardingState } from "./api";

export const FIRST_RUN_ENGINE_PROMPT =
  "Begin our first conversation now. Introduce yourself warmly in your own voice, then ask what we should call each other.";

export type FirstRunCeremonyPhase =
  | "idle"
  | "checking"
  | "starting"
  | "awaiting_name"
  | "saving_name"
  | "complete"
  | "unavailable";

export function shouldStartEngineFirstTurn({
  onboarding,
  messageCount,
}: {
  onboarding: BotOnboardingState | null;
  messageCount: number;
}): boolean {
  return onboarding?.completed === false && onboarding.can_start_chat_now !== false && messageCount === 0;
}

export function normalizeFirstRunAgentName(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

export function buildBotIdentityDocument(value: string): string {
  const name = normalizeFirstRunAgentName(value) || "ZAKI";
  return `# IDENTITY.md - ZAKI BOT Identity

This agent lives in the dedicated ZAKI BOT space.
Built by NovaNuggets.

- **Name:** ${name}
- **Role:** personal AI operator inside ZAKI
- **Vibe:** warm, sharp, proactive
- **Emoji:** optional
- **Avatar:** optional

## Notes

- The user chose this name during the first-run ceremony.
- Keep this file aligned with how the user experiences you.
- If Telegram or other channels are connected, the identity should stay consistent across all of them.
- If a request is pure normal LLM chat with no execution/tooling need, suggest using a normal Space and offer a ready prompt.
`;
}

export async function runFirstRunNameCompletion({
  name,
  readNamingCheckpoint,
  writeNamingCheckpoint,
  clearNamingCheckpoint,
  persistIdentity,
  sendNamingTurn,
  persistCompletion,
}: {
  name: string;
  readNamingCheckpoint: () => string | null;
  writeNamingCheckpoint: (name: string) => void;
  clearNamingCheckpoint: () => void;
  persistIdentity: () => Promise<void>;
  sendNamingTurn: () => Promise<void>;
  persistCompletion: () => Promise<void>;
}): Promise<void> {
  await persistIdentity();
  if (readNamingCheckpoint() !== name) {
    await sendNamingTurn();
    writeNamingCheckpoint(name);
  }
  await persistCompletion();
  clearNamingCheckpoint();
}
