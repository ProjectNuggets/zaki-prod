import type { Space, Thread } from "@/types";

export const ZAKI_BOT_SPACE_ID = "zaki-bot";
export const ZAKI_BOT_THREAD_ID = "main";
export const ZAKI_BOT_LABEL = "ZAKI";
export const ZAKI_BOT_THREAD_LABEL = "NULLALIS";
export const ZAKI_BOT_DESCRIPTION = "Your personal AI operator";

export function createZakiBotThread(): Thread {
  return {
    id: ZAKI_BOT_THREAD_ID,
    label: ZAKI_BOT_THREAD_LABEL,
  };
}

export function createZakiBotSpace(): Space {
  return {
    id: ZAKI_BOT_SPACE_ID,
    title: ZAKI_BOT_LABEL,
    description: ZAKI_BOT_DESCRIPTION,
    icon: "sparkles",
    fixed: true,
    threads: [createZakiBotThread()],
  };
}

export function isZakiBotSpaceId(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase() === ZAKI_BOT_SPACE_ID;
}
