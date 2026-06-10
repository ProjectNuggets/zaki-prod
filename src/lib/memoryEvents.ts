/**
 * Window events that should make the OPEN in-chat memory panel refetch its data.
 *
 * Deliberately EXCLUDES "zaki:memory-conflicts-count": the panel emits that event
 * itself, on every data load (MemoryViewer.fetchConflicts). Using it as a refresh
 * trigger creates an infinite load -> dispatch-count -> bump refreshKey -> load
 * loop — the "flashing drawer" bug. Only "zaki:memory-changed" — emitted by the
 * chat SSE on a real memory mutation and NEVER by the panel itself — should drive a
 * refresh, so there is no self-loop. The conflict-count event still updates the
 * badge via its own listener; it just must not drive a refetch.
 */
export const MEMORY_PANEL_REFRESH_EVENTS = ["zaki:memory-changed"] as const;
