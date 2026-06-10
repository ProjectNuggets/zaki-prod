/**
 * Window events that should make the OPEN in-chat memory panel refetch its data.
 *
 * Only "zaki:memory-changed" — emitted by the chat SSE on a real memory mutation
 * and NEVER by the panel itself — should drive a refresh, so there is no self-loop
 * (the old "flashing drawer" bug). The panel renders solely from the memories list.
 */
export const MEMORY_PANEL_REFRESH_EVENTS = ["zaki:memory-changed"] as const;
