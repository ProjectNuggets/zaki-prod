# In-Chat Memory Panel Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the in-chat memory modal with a right-side panel (dossier + On/Off + recent + review) and enable per-response "memories used" chips — reusing existing components, no new backend.

**Architecture:** Convert the existing memory modal shell to a right-side drawer that renders `MemoryViewer` in a new `variant="panel"` mode (hides scope cards + the 5-mode toggle, shows a binary On/Off, refreshes on SSE memory-change). Enable the already-built `MessageBubble` memory-sources reveal and add edit/delete to it. All driven by existing `/api/memory/*` endpoints, the existing `zaki:open-memory`/`memoryOpen` machinery, the existing `/api/memory/events` SSE, and the existing `updateAssistantSources` message wiring.

**Tech Stack:** React + TypeScript, Tailwind (zaki design tokens), Jest + Testing Library, i18n (en/ar).

**Spec:** `docs/superpowers/specs/2026-06-10-memory-panel-redesign-design.md`
**Branch:** `chat-memory-feels-known` (continues the feels-known work).

---

## File Structure

- **Modify** `src/app/components/memory/MemoryViewer.tsx` — add `variant?: "modal" | "panel"` (default "modal"): in "panel", hide the Personal/Space/Session scope cards and the 5-mode `MemoryModeToggle`, and render a binary **Memory On/Off** control instead; expose an `onRefreshRef`/refresh hook so the drawer can trigger a refetch on SSE change.
- **Modify** `src/app/components/Sidebar.tsx` (~2334-2388) — convert the centered memory **modal** shell into a **right-side drawer** (full-screen sheet on mobile); render `<MemoryViewer variant="panel" …/>`. Subscribe the open panel to a refresh on memory-change.
- **Modify** `src/app/components/chat/MessageBubble.tsx` (~250-300) — enable the memories-used reveal and add per-source **Edit**/**Delete** actions.
- **Modify** `src/app/components/ChatArea.tsx` — ensure assistant messages carry `memorySources` (reconcile `updateAssistantSources` field) and pass the reveal-enabling props to `MessageBubble`; refresh the open panel on the existing `/api/memory/events` SSE signal.
- **Modify** `src/i18n/locales/en.json` + `ar.json` — copy for On/Off, "memories used", edit/delete-in-reveal.
- **Tests**: `src/app/components/memory/MemoryViewer.test.tsx`, `src/app/components/chat/MessageBubble.test.tsx` (create if absent).

Frontend checks: `npm run typecheck` (repo root) and `npx jest --config jest.config.cjs <path>`.

---

## Task 1: `MemoryViewer` panel variant (binary On/Off, hide scopes + 5-mode toggle)

**Files:**
- Modify: `src/app/components/memory/MemoryViewer.tsx`
- Test: `src/app/components/memory/MemoryViewer.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `MemoryViewer.test.tsx` (follow the existing render/mocking setup in that file — it already mocks `@/lib/api`):

```tsx
it("panel variant shows a binary On/Off and hides scope cards + 5-mode toggle", async () => {
  render(<MemoryViewer userId="u@x.co" variant="panel" />);
  // binary control present
  expect(await screen.findByRole("switch", { name: /memory/i })).toBeInTheDocument();
  // 5-mode capture toggle gone
  expect(screen.queryByText(/ask_before_saving|save_less|save_more/i)).not.toBeInTheDocument();
  // scope cards gone
  expect(screen.queryByText(/Personal memory|Space context|session context/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx jest --config jest.config.cjs src/app/components/memory/MemoryViewer.test.tsx -t "panel variant"`
Expected: FAIL (no `variant` prop; switch not found).

- [ ] **Step 3: Add the `variant` prop + binary On/Off, gate the scope cards & 5-mode toggle**

In `MemoryViewer.tsx`:
1. Add to the props interface: `variant?: "modal" | "panel";` and default it: `variant = "modal"` in the component signature.
2. Find the scope-cards block (the Personal/Space/Session cards in the Notebook section) and the `<MemoryModeToggle .../>` render (~line 835). Wrap both in `{variant !== "panel" && ( … )}`.
3. Where the 5-mode toggle was, render a binary control in panel mode using the existing `useMemoryPolicy()` hook (it exposes `policy`, `setPolicy`, `saving`):

```tsx
{variant === "panel" && (
  <div className="flex items-center justify-between rounded-zaki-lg border border-zaki-subtle bg-white p-4">
    <div>
      <p className="text-sm font-medium text-zaki-primary">{t("memoryPanel.onoff.title", { defaultValue: "Memory" })}</p>
      <p className="mt-1 text-2xs text-zaki-muted">{t("memoryPanel.onoff.hint", { defaultValue: "When on, ZAKI remembers useful details and uses them in chat." })}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={policy !== "off"}
      aria-label={t("memoryPanel.onoff.title", { defaultValue: "Memory" })}
      disabled={saving}
      onClick={() => setPolicy(policy === "off" ? "balanced" : "off")}
      className={cn("relative h-6 w-11 rounded-full transition-colors", policy !== "off" ? "bg-zaki-success" : "bg-zaki-subtle")}
    >
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-transform", policy !== "off" ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  </div>
)}
```

(`useMemoryPolicy`, `cn`, `useTranslation` are already imported in this file or in `MemoryModeToggle`; import `useMemoryPolicy` from `./MemoryModeToggle` and `cn` from `@/lib/utils` if not already.)
Note the On→`balanced` mapping intentionally normalizes to the default when re-enabling (the panel doesn't expose the aggressiveness modes; turning On after Off restores default capture).

- [ ] **Step 4: Run it, verify it passes**

Run: `npx jest --config jest.config.cjs src/app/components/memory/MemoryViewer.test.tsx -t "panel variant"`
Expected: PASS.

- [ ] **Step 5: Toggling test**

```tsx
it("panel On/Off toggle persists policy=off", async () => {
  const { updateMemoryPreferences } = await import("@/lib/api");
  render(<MemoryViewer userId="u@x.co" variant="panel" />);
  const sw = await screen.findByRole("switch", { name: /memory/i });
  fireEvent.click(sw);
  await waitFor(() => expect(updateMemoryPreferences).toHaveBeenCalledWith("off"));
});
```

(Ensure the test mock for `@/lib/api` includes `updateMemoryPreferences`/`fetchMemoryPreferences` returning a policy; mirror existing mocks.)

- [ ] **Step 6: Run + commit**

Run: `npx jest --config jest.config.cjs src/app/components/memory/MemoryViewer.test.tsx && npm run typecheck`
Expected: PASS, no type errors.

```bash
git add src/app/components/memory/MemoryViewer.tsx src/app/components/memory/MemoryViewer.test.tsx
git commit -m "feat(memory-ui): MemoryViewer panel variant — binary On/Off, hide scopes + 5-mode toggle"
```

---

## Task 2: Convert the memory modal to a right-side drawer

**Files:**
- Modify: `src/app/components/Sidebar.tsx` (the `{memoryOpen && …}` block ~2334-2388)

- [ ] **Step 1: Convert the shell to a right drawer rendering the panel variant**

Replace the modal container markup (the centered `fixed inset-0 flex items-center justify-center` overlay + the `w-[720px]` dialog) with a right-anchored slide-in drawer; keep the same header, close button, and the `memoryOpen`/`setMemoryOpen`/`memorySearchQuery`/`memoryInitialTab` machinery. Render `<MemoryViewer variant="panel" … />`:

```tsx
{memoryOpen && user?.username && (
  <div className="fixed inset-0 z-50">
    <div className="absolute inset-0 bg-black/20 dark:bg-black/50" onClick={closeMemory} aria-hidden="true" />
    <div
      role="dialog" aria-modal="true" aria-label={t("sidebar.memory.title")}
      data-onboarding-id="memory-viewer-dialog"
      className="absolute right-0 top-0 h-full w-full sm:w-[420px] md:w-[460px] bg-white dark:bg-zaki-dark-card border-l border-zaki-subtle dark:border-zaki-dark shadow-[0_24px_60px_rgba(15,15,15,0.18)] flex flex-col"
    >
      {/* keep the existing header block (Brain icon + title/subtitle + close button) */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <MemoryViewer
          userId={user.username}
          variant="panel"
          initialSearchQuery={memorySearchQuery}
          initialTab={memoryInitialTab}
        />
      </div>
    </div>
  </div>
)}
```

Define a `closeMemory` helper (or reuse the inline close logic already present) that does `setMemoryOpen(false); setMemorySearchQuery(""); setMemoryInitialTab("memories")`. On mobile the `w-full` makes it a full-screen sheet; `sm:w-[420px]` makes it a right drawer on larger screens.

- [ ] **Step 2: Verify open/close via existing entry points**

Run the app (or rely on existing Sidebar tests if present). Manually confirm: chat three-dots → "Review Memories" opens the drawer from the right; the capture toast "Open memory" and the home affordance (both dispatch `zaki:open-memory`) open the same drawer (they all flow through `handleOpenMemory` → `memoryOpen`). No code change needed at those call sites — the rewire is centralized here.

Run: `npm run typecheck`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/Sidebar.tsx
git commit -m "feat(memory-ui): in-chat memory surface is now a right-side drawer (panel)"
```

---

## Task 3: Self-updating dossier (refresh on memory-change)

**Files:**
- Modify: `src/app/components/memory/MemoryViewer.tsx` (expose a refresh) and/or `src/app/components/Sidebar.tsx` (trigger it)

**Context:** The frontend already subscribes to `/api/memory/events` (`ChatArea.tsx:6821`) and the panel already fetches list/activity on mount. We need the open panel to refetch when memory changes so the dossier is "self-updating."

- [ ] **Step 1: Add a refresh trigger to the panel**

`MemoryViewer` already loads data in an effect. Add a `refreshKey?: number` prop (or reuse an existing effect dependency) so that incrementing it re-runs the data load (list + activity + confirmations + conflicts → recompute the grouped dossier). Add `refreshKey` to that effect's dependency array.

- [ ] **Step 2: Drive `refreshKey` from the memory-change signal in Sidebar**

In `Sidebar.tsx`, add `const [memoryRefreshKey, setMemoryRefreshKey] = useState(0);` and bump it when the existing memory-status signal fires. The app already updates a conflict/pending count via the `zaki:memory-conflicts-count` event and the `/api/memory/events` SSE; add a listener that bumps the key:

```tsx
useEffect(() => {
  const bump = () => setMemoryRefreshKey((k) => k + 1);
  window.addEventListener("zaki:memory-conflicts-count", bump);
  window.addEventListener("zaki:memory-changed", bump);
  return () => {
    window.removeEventListener("zaki:memory-conflicts-count", bump);
    window.removeEventListener("zaki:memory-changed", bump);
  };
}, []);
```

Pass `refreshKey={memoryRefreshKey}` to `<MemoryViewer variant="panel" …/>`. If a dedicated `zaki:memory-changed` event isn't already dispatched by the SSE handler in ChatArea, add one line in that handler (where it processes `/api/memory/events` status messages, ~ChatArea.tsx:6821) to `window.dispatchEvent(new Event("zaki:memory-changed"))` on a status change.

- [ ] **Step 3: Verify + commit**

Run: `npm run typecheck && npx jest --config jest.config.cjs src/app/components/memory/MemoryViewer.test.tsx`
Expected: PASS.

```bash
git add src/app/components/memory/MemoryViewer.tsx src/app/components/Sidebar.tsx src/app/components/ChatArea.tsx
git commit -m "feat(memory-ui): dossier self-updates on memory-change (SSE-driven refresh)"
```

---

## Task 4: Per-response "memories used" chips (enable + add actions)

**Files:**
- Modify: `src/app/components/chat/MessageBubble.tsx` (~250-300)
- Modify: `src/app/components/ChatArea.tsx` (pass the reveal props; confirm `memorySources` field)
- Test: `src/app/components/chat/MessageBubble.test.tsx`

**Context:** `MessageBubble` already accepts `memorySources` and renders a `showWhy` reveal with `chat.usedMemoryCount` ([:281-295]). It is likely not enabled and has no actions. `updateAssistantSources` (ChatArea.tsx:4269) sets sources on the message — confirm it writes `message.memorySources` (reconcile if it writes `.sources`).

- [ ] **Step 1: Reconcile the field**

Read `updateAssistantSources` (ChatArea.tsx:4269-4290) and the `Message` type. Ensure the attached field is `memorySources` (the name `MessageBubble` reads). If it writes `sources`, either rename to `memorySources` or read both in MessageBubble (`message.memorySources ?? message.sources`). Pick one and make it consistent.

- [ ] **Step 2: Write the failing test**

`MessageBubble.test.tsx`:

```tsx
it("renders a 'memories used' chip when the message has memorySources", () => {
  render(<MessageBubble message={{ id:"m1", role:"assistant", content:"hi", memorySources:[{id:"a",content:"Lives in Riyadh",type:"fact"}] } as any} showWhy />);
  expect(screen.getByText(/used .*memor/i)).toBeInTheDocument();
});
it("offers delete on a used memory", async () => {
  const { deleteMemory } = await import("@/lib/api");
  render(<MessageBubble message={{ id:"m1", role:"assistant", content:"hi", memorySources:[{id:"a",content:"Lives in Riyadh",type:"fact"}] } as any} showWhy />);
  fireEvent.click(screen.getByRole("button", { name: /don.t use|delete/i }));
  await waitFor(() => expect(deleteMemory).toHaveBeenCalledWith("a"));
});
```

(Add a `deleteMemory(id)` helper to `@/lib/api` if one isn't exported — check `src/lib/api.ts`; there is `patchMemory`; add `deleteMemory` calling `DELETE /api/memory/{id}` mirroring `patchMemory`. Mock it in the test.)

- [ ] **Step 3: Run, verify fail**

Run: `npx jest --config jest.config.cjs src/app/components/chat/MessageBubble.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Enable the reveal + add Delete/Edit actions**

In `MessageBubble.tsx`, in the `showWhy && memorySources.length > 0` block (~281), for each `source` add small action buttons:

```tsx
<button
  type="button"
  className="text-2xs text-zaki-muted underline"
  onClick={async () => { try { await deleteMemory(source.id); onMemoryForgotten?.(source.id); } catch {} }}
>
  {t("chat.memoryDontUse", { defaultValue: "Don't use this" })}
</button>
```

Add `deleteMemory` import from `@/lib/api` and an optional `onMemoryForgotten?: (id: string) => void` prop (so the parent can drop it from the message's sources). Keep the reveal collapsed by default (it already is, behind `showWhy`).

- [ ] **Step 5: Enable the reveal where MessageBubble is rendered**

In `ChatArea.tsx`, where `<MessageBubble … />` is rendered for assistant messages, pass `showWhy` (and/or `showSourceChip`) so the memories-used reveal appears when `memorySources` exist. Gate on `isMemoryPipelineEnabled` to keep it off for the agent/zaki-bot space. Pass `onMemoryForgotten` to remove the source from the message via the existing message-update path.

- [ ] **Step 6: Run + commit**

Run: `npx jest --config jest.config.cjs src/app/components/chat/MessageBubble.test.tsx && npm run typecheck`
Expected: PASS.

```bash
git add src/app/components/chat/MessageBubble.tsx src/app/components/ChatArea.tsx src/lib/api.ts src/app/components/chat/MessageBubble.test.tsx
git commit -m "feat(memory-ui): per-response 'memories used' reveal with don't-use action"
```

---

## Task 5: i18n + cleanup verification

**Files:**
- Modify: `src/i18n/locales/en.json`, `src/i18n/locales/ar.json`
- Verify: `src/app/components/memory/MemoryViewer.tsx`, `src/app/components/Sidebar.tsx`

- [ ] **Step 1: Add i18n keys**

In `en.json` add under appropriate sections:
```json
"memoryPanel": { "onoff": { "title": "Memory", "hint": "When on, ZAKI remembers useful details and uses them in chat." } },
"chat": { "memoryDontUse": "Don't use this" }
```
(Merge into existing `chat`/`memoryPanel` objects rather than duplicating.) Add Arabic equivalents in `ar.json`: title "الذاكرة", hint "عند التفعيل، يتذكّر زاكي التفاصيل المفيدة ويستخدمها في الدردشة."، memoryDontUse "لا تستخدم هذا".

- [ ] **Step 2: Verify removals**

Confirm: in `variant="panel"`, the scope cards and 5-mode toggle do NOT render (covered by Task 1 test). Confirm the modal centered shell is gone (Task 2). Confirm all three entry points (three-dots, capture toast, home affordance) open the drawer (they share `zaki:open-memory`). The `MemoryModeToggle` component itself remains for the Settings page (untouched here).

- [ ] **Step 3: Full check + commit**

Run: `npm run typecheck && npx jest --config jest.config.cjs src/app/components/memory src/app/components/chat`
Expected: PASS.

```bash
git add src/i18n/locales/en.json src/i18n/locales/ar.json
git commit -m "feat(memory-ui): i18n for memory panel On/Off + memories-used reveal"
```

---

## Self-Review (completed by author)

- **Spec coverage:** panel replaces modal → Task 2; dossier (deterministic, self-updating) → Tasks 1 (reuse grouping) + 3 (refresh); On/Off only → Task 1; all-in-panel management (list/edit/delete + pending/conflicts) → reused from MemoryViewer body in panel variant; per-response chips → Task 4; cleanup (scopes, 5-mode toggle, modal) → Tasks 1+2+5; rewire all entry points centrally → Task 2; no new backend → confirmed (uses existing endpoints + SSE + `updateAssistantSources`). All spec items mapped.
- **Placeholders:** none — concrete code/tests/commands per step. Field-name reconciliation (Task 4 Step 1) and the `deleteMemory` helper are explicit verify/add steps, not vague TODOs.
- **Type consistency:** `variant: "modal" | "panel"` used consistently (Tasks 1, 2); `refreshKey` (Task 3) matches between MemoryViewer prop and Sidebar state; `memorySources` field reconciled once (Task 4) and used in MessageBubble + tests; `deleteMemory(id)` signature consistent across api.ts, MessageBubble, and tests.
- **Risk note:** On→`balanced` mapping can override a non-default capture policy set in Settings; acceptable per the "On/Off only" decision (documented in Task 1 Step 3).
