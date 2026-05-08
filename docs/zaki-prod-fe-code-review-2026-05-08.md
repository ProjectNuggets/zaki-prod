# ZAKI FE code review — 2026-05-08

Scope: 9 commits on `main` (from `2ac1ee3` chore through `5abc5ae` compaction-meter fix) plus three uncommitted edits in `src/app/components/InputArea.tsx`, `src/app/components/ChatArea.tsx`, `src/stores/zakiSessionUiStore.test.ts`. Severity is `P0` (broken / silent data corruption / user-visible incorrect behavior), `P1` (bug, but contained), `P2` (cleanup / latent risk).

Code I read: `src/app/components/agent/ZakiSettingsSheet.tsx` (full), the meter-related slices of `ChatArea.tsx` and `InputArea.tsx`, `src/stores/zakiSessionUiStore.ts` (full), `src/i18n/locales/{en,ar}.json` (zakiSettingsSheet block), `ZakiSettingsSheet.test.tsx`, `src/lib/api.ts` (relevant endpoints).

---

## P0

### P0-01 — Voice-replies "Connect Telegram" button silently fakes success and calls the wrong endpoint

`src/app/components/agent/ZakiSettingsSheet.tsx:1473-1480`

```tsx
onClick={async () => {
  try {
    await connectAgentTelegram({});
    toast.success(t("zakiSettingsSheet.fields.voiceReplies.connectTelegramSuccess"));
  } catch {
    toast.error(t("zakiSettingsSheet.fields.voiceReplies.connectTelegramError"));
  }
}}
```

Two compounding problems:

1. `connectAgentTelegram({})` posts an empty body to `/api/agent/channels/telegram/connect`. The server will reject this (no `bot_token`). But `backendAuthRequest` (`src/lib/api.ts:232-257`) returns the response object on non-2xx, it does not throw. So the `try` block resolves on a 4xx, the success toast fires, and the user sees "Telegram connected." while nothing was connected.
2. The function called is the legacy `connectAgentTelegram` (different endpoint: `/api/agent/channels/telegram/connect`). The whole new Channels surface uses `connectBotTelegram` (`/api/v1/me/bot/telegram/connect`) per the Phase 4-B step 3 work. This button is the only remaining caller of `connectAgentTelegram` in `src`. It does not match the new flow, does not pass a token, and is positioned inside Response Style as a shortcut to the new Channels rail entry.

Minimum fix: change the click handler so it sets `setActiveSection("channels")` (the new behavior the user expects from "Connect Telegram" while the meter is in Response Style), and delete the dead `connectAgentTelegram` import + helper if it has no other consumers (`grep` shows none in `src/`). At a bare minimum, check `response.ok` before toasting success.

---

### P0-02 — `ZakiSettingsSheet.test.tsx` is wired against the old accordion section keys, the suite no longer matches the rail

`src/app/components/agent/ZakiSettingsSheet.test.tsx:137-141, 194, 228, 268, 274, 283`

The test asserts `getByText("zakiSettingsSheet.sections.overview.title")`, clicks `getByRole("button", { name: /zakiSettingsSheet.sections.assistant.title/i })`, etc. None of those are rendered any more. The new rail iterates `SECTION_META` and renders `t(\`zakiSettingsSheet.rail.${id}.label\`)` (`ZakiSettingsSheet.tsx:382`). The buttons are titled `rail.identity.label`, `rail.responseStyle.label`, `rail.channels.label`, `rail.autonomy.label`, `rail.plan.label`. Every test in the file that depends on clicking one of those tabs (`shows the assistant controls and save action`, `disables voice replies and heartbeat when Telegram is disconnected`, `toggles heartbeat through the separate endpoint`, `allows Telegram connect without allow_from in the normal flow`) will fail at the `getByRole` query before it ever reaches its assertion.

Either the suite was not run against the post-trim component or the regression has already shipped silently. Update every `sections.<name>.title` reference to the matching `rail.<id>.label`. Note that `assistant` → `responseStyle`, and `telegram` is now reached via the `channels` rail entry (the Telegram form still lives there).

---

## P1

### P1-01 — `refreshContextGauge` clobbers a good pressure value with `null` on every transient failure

`src/app/components/ChatArea.tsx:2938-2960`

```tsx
const { data } = await fetchAgentSessionContext(sessionKey);
const pressurePct =
  typeof data?.context_pressure_percent === "number"
    ? data.context_pressure_percent
    : typeof data?.context_window_used_pct === "number"
    ? data.context_window_used_pct
    : null;
setSessionContextPressure(sessionKey, pressurePct);
```

`response.ok` is never checked. Any 4xx/5xx where `parseApiJson` returns `{}` (or any 200 where the agent transiently omits `context_pressure_percent`, which the store comment at `zakiSessionUiStore.ts:80-86` admits is something the list endpoint already does) lands `setSessionContextPressure(sessionKey, null)`. That re-runs `getContextPressureState(null) → null` and the store row becomes `{contextPressurePercent: null, contextPressureState: null}`. With the new 15s polling effect at `ChatArea.tsx:2984-2998` this turns one transient hiccup into a meter that snaps to 0% and a tooltip whose `state` collapses to null, until the next non-failing poll.

The whole point of the 5abc5ae fix was that out-of-band pressure changes must not be wiped by intermediate states. The polling effect re-introduces the same shape of bug, just on a faster interval.

Two-line fix: gate on `response.ok`, and only call `setSessionContextPressure` when `pressurePct !== null` (or accept null only when the response was OK and the field was explicitly null in the payload, not when it was missing from a non-OK body).

---

### P1-02 — `mapAgentSessionToZakiSessionUi` still wipes `pendingApprovals` and `approvalCount` from the list endpoint, same shape as the pressure bug it just fixed

`src/stores/zakiSessionUiStore.ts:53-79`

The fix at lines 80-90 surgically excludes `contextPressurePercent` / `contextPressureState` from the patch when the list endpoint doesn't include them. But two lines up, `approvalCount` and `pendingApprovals` are still always written:

```ts
approvalCount:
  typeof session.pending_approval_count === "number"
    ? Math.max(0, session.pending_approval_count)
    : 0,
pendingApprovals: Array.isArray(session.pending_approvals)
  ? session.pending_approvals.map(...)
  : [],
```

Same race the pressure fix was protecting against: the SSE stream calls `incrementApprovalCount` to record an in-flight approval, then `useZakiSessions` ticks (every 30s per existing comments), `mapAgentSessionToZakiSessionUi` runs on a list row that omits `pending_approvals`, the patch sets both to `[]` / `0`, and the active approval card disappears from the UI until the next session-detail fetch.

Not introduced by this commit set, but it's the same anti-pattern in the same function and a code reviewer staring at the new comment block at lines 80-86 should fix it in the same place. Apply the same `if (Array.isArray(session.pending_approvals))` / `if (typeof session.pending_approval_count === "number")` guards around those two assignments.

---

### P1-03 — `connectAgentTelegram` import + library function are dead-but-deceptive after the channels move

`src/app/components/agent/ZakiSettingsSheet.tsx:24` and `src/lib/api.ts:1509-1516`

`grep -rn "connectAgentTelegram" src` shows two references: the buggy call site flagged in P0-01 and the api.ts definition. Once P0-01 is fixed (and the click handler stops hitting the legacy endpoint), `connectAgentTelegram` is dead and should be deleted from `src/lib/api.ts`. Leaving it imported but unused invites the next person to wire something else to the wrong endpoint.

The same goes for `disconnectAgentTelegram` at `src/lib/api.ts:1518-1524` — no consumers in `src/`.

---

### P1-04 — Massive i18n key bloat from the trim, several still in the bundle and shipping to the client

`src/i18n/locales/en.json` and `src/i18n/locales/ar.json`

After the 9-section → 5-section trim plus the channels and tier-badge work, the following keys (verified with `grep -rn` in `src/`) have zero referencing call sites and are still bundled:

- `zakiSettingsSheet.badge`
- `zakiSettingsSheet.locked.title`, `zakiSettingsSheet.locked.note`
- `zakiSettingsSheet.header.readySummary`, `zakiSettingsSheet.header.setupSummary`
- `zakiSettingsSheet.summary.ready`, `zakiSettingsSheet.summary.setupInProgress`
- `zakiSettingsSheet.loading.onboarding`
- `zakiSettingsSheet.sections.overview.*`, `sections.core.*`, `sections.assistant.title`, `sections.telegram.*`, `sections.autonomy.*`, `sections.workspace.*`, `sections.limits.*`, `sections.advanced.*` (only `sections.assistant.summary` and `sections.usage.*` are still used)
- `zakiSettingsSheet.fields.responseStyle.modes.{fast,balanced,deep}.helper` (only `.description` is still rendered)
- `zakiSettingsSheet.workspace.{memoryTitle, memorySummary, memoryHelper, reviewMemory, openHelp, setupTitle, setupHelper, channelsTitle, channelsSummary, channelsSummaryLine, channelsHelper, channelDescriptions.*, telegramWebhook}` and `workspace.channelStatus.needsSetup`
- `zakiSettingsSheet.telegram.{statusTitle, statusHelper, statusConnecting, statusVerifying, statusNeedsAttention, connectingHelper, verifyingHelper, needsAttentionHelper, webhookBaseLabel, webhookBaseSummary, webhookBaseHelper}`
- `zakiSettingsSheet.errors.{telegramConnectUnconfirmed, telegramWebhookRequired, telegramWebhookInvalid, botStateUnavailable}`
- `zakiSettingsSheet.actions.{provisioning, provision, markIncomplete, markComplete, manage, comingSoon, hide, openSettings, openHelp}`
- `zakiSettingsSheet.success.{provisioned, onboardingComplete, onboardingReopened}`
- `zakiSettingsSheet.placeholders.{comingSoon, tierLocked, saveChangesAria, placeholder, placeholderModels, placeholderBrain, placeholderPrivacy, placeholderAdvanced}` (only `placeholders.navAria` is read)
- `zakiSettingsSheet.rail.{brain, models, privacy, advanced}.{label, summary}` plus `.summary` for the five surviving entries (`rail.identity`, `rail.responseStyle`, `rail.channels`, `rail.autonomy`, `rail.plan` — the rail only reads `.label`, see `ZakiSettingsSheet.tsx:382`)
- The whole `zakiSettingsSheet.limits.*` subtree
- The whole `zakiSettingsSheet.advanced.*` subtree

Every one of these is duplicated in `ar.json`, so the cleanup is doubly valuable. Confirmed with:

```
grep -oE "zakiSettingsSheet\\.[a-zA-Z0-9_.]+" src/app/components/agent/ZakiSettingsSheet.tsx | sort -u
```

against the i18n files. The user explicitly called this out in the brief; calling it P1 because shipping ~80 unused localization strings to every browser is a real load issue at AR/EN parity, and because translators will keep reviewing copy that nothing renders.

---

### P1-05 — `TierBadge` `tier === "locked"` branch is unreachable in production

`src/app/components/agent/ZakiSettingsSheet.tsx:547-576`

`TierBadge` is only rendered once in this file, at `ZakiSettingsSheet.tsx:1237-1240`, with `tier={planTierKey}`. `planTierKey` is one of `"free" | "personal" | "student" | "pro" | "codeActive"` (declared at `:545`). Nothing ever passes `"locked"`. The `Lock` icon import (line 11) and the locked-branch styling are now dead.

Either delete the `"locked"` variant from the `tier` prop type and the conditional, or wire the rail entries with elevated tiers (Models / Brain / Privacy / Advanced) back in as locked badges — given those sections are gone, the right move is deletion.

---

## P2

### P2-01 — Polling overlap not guarded; an in-flight `refreshContextGauge` call can land after the next 15s tick

`src/app/components/ChatArea.tsx:2984-2998`

`window.setInterval(() => { void refreshContextGauge(); }, 15_000)` does not cancel a pending request when the next tick fires. If the API is slow (>15s) or the user changes session mid-flight, two responses can race and last-write-wins ends up with the stale one. Combined with P1-01, a slow stale 200 carrying no `context_pressure_percent` will overwrite a fresh good value.

Defensive shape: track an `AbortController` per request; abort the previous one before issuing the next; check the request token in the `setSessionContextPressure` call. Or, since this is a polling background task, swap to `setTimeout` chaining (fire next poll only after the previous resolves).

### P2-02 — Polling continues while the tab is hidden

`src/app/components/ChatArea.tsx:2984-2998`

Browsers throttle backgrounded `setInterval` to ~1s minimum, so it's not a CPU problem, but the agent endpoint will still be hit every 15s for tabs sitting in the background indefinitely. Pair the interval with `document.visibilityState === "visible"`, or pause the interval on `visibilitychange`. Not a bug but a $$ and load concern that gets worse with every client.

### P2-03 — `pendingApprovals.timestamp = Date.now()` set on every map call hides ordering

`src/stores/zakiSessionUiStore.ts:69`

Every time `mapAgentSessionToZakiSessionUi` runs on a session-list row, the `timestamp` is reset to `Date.now()`. Once P1-02 is fixed, this stops mattering for the list endpoint; for the detail endpoint it still resets on every `hydrateActiveSessionDetail` call. If anything downstream sorts by `timestamp` it gets the time of the last hydrate, not the time of approval creation. Carry the backend timestamp through the AgentPendingApproval shape if there is one; otherwise preserve existing in-store timestamp via the merge in `hydrateSession`.

### P2-04 — `getStatusTone("warning")` returns brand-tinted colors, not warning-tinted, despite the name

`src/app/components/agent/ZakiSettingsSheet.tsx:213-223`

```ts
if (status === "warning") {
  return "border-zaki-strong bg-zaki-hover text-zaki-primary dark:text-zaki-dark-primary";
}
```

The "warning" branch returns no warning colors. The "error" branch correctly uses `border-zaki-brand/30 bg-zaki-brand/10`. Pre-existing, but it's now visible at `ZakiSettingsSheet.tsx:1274` whenever onboarding is stuck on `minimumRequired.length > 0` without operator-required, which is most pre-Telegram-connect states. Fix: route warning to `bg-zaki-warning text-zaki-primary border-zaki-warning` (those tokens exist per `src/styles/tokens.css:119-120, 412-414`).

### P2-05 — Compaction-meter visible at 0% when pressure is unknown

`src/app/components/InputArea.tsx:142-152`

The new behavior renders the ring at 0% when `zakiContextPressurePercent === null`. The new comment justifies it as "honest about the empty context", but `null` from the chain at `ChatArea.tsx:6216-6222` actually means "we have not yet received a /context response." Rendering a green 0% ring during the bootstrap window can mislead a user into thinking the context is empty when in fact we just have not heard yet. Trade-off: distinguish `null` (unknown — render an idle/uncolored ring or a thin 1px outline) from `0` (known-empty — render the green 0%). Acceptable as is, but worth a thought from Nova.

### P2-06 — `pressureColor` thresholds (50/75) do not match `getContextPressureState` thresholds (70/90)

`src/app/components/InputArea.tsx:147-152` vs `src/stores/zakiSessionUiStore.ts:5-6, 100-102`

The ring color at 71% reads amber (color path: `>50, ≤75 → warning`) while the store-derived `contextPressureState` is `"warning"` (state path: `≥70 → warning`). At 76% the ring goes red but the state is still `warning`. At 90% they finally agree on `near_limit`/red. If anything else in the UI keys off `contextPressureState` (tooltip strings via `zakiControls.context.{normal,warning,near_limit}` for example), the colors visible in the ring and the words in the tooltip will disagree from 70-89%. Not strictly a bug, just inconsistent thresholds — pick one source of truth and reuse `CONTEXT_PRESSURE_WARNING` / `CONTEXT_PRESSURE_NEAR_LIMIT` for the ring tiers too.

### P2-07 — Test coverage gap on the new omit-pressure path

`src/stores/zakiSessionUiStore.test.ts:68-79`

The added test asserts that the patch shape omits the keys, which is good. It does not assert that `hydrateSession` actually preserves the prior store value across a list-tick that omits pressure. The merge happens at `zakiSessionUiStore.ts:139-154` and uses `patch.contextPressurePercent ?? state.sessions[normalized]?.contextPressurePercent ?? null` for the derived state. A test that calls `setContextPressure(key, 92)` then `hydrateSession(key, mapAgentSessionToZakiSessionUi({mode: "execute"}))` and asserts the value is still `92` would lock the regression in.

---

## ChannelCard quick check

`src/app/components/agent/ZakiSettingsSheet.tsx:441-539` — read end-to-end:

- A11y: status is announced via the badge text (e.g. `"COMING SOON"`). No `aria-label` on the card itself, but the heading and tagline are present in the DOM order. `aria-hidden` on the icon span is correct.
- Dark mode: `dark:bg-zaki-dark-card dark:border-zaki-dark-card` is applied. The status pill colors use the `bg-zaki-{accent-15,brand-15,warning,hover}` family which are CSS-variable-driven, so dark mode resolves through tokens. Looks fine.
- RTL: `flex-row-reverse text-right` is applied to the header row when `isRtl`. Inner header `flex items-center gap-2` also gets `flex-row-reverse`. The icon tile and divider work without extra logic because they are not directional. The "open BotFather" arrow (`ZakiSettingsSheet.tsx:1577-1580`) flips between `→` and `←` based on `isRtl`. OK.
- Coming-soon variants render no children (no `<button>`s wired to anything), which matches the brief that Slack / Discord / WhatsApp are placeholders. The status pill "COMING SOON" renders.

No bugs in the card itself. The Telegram `<ChannelCard>` and its enclosed setup form (`:1530-1646`) wire correctly to `handleTelegramConnect` / `handleTelegramDisconnect` (the per-button handlers run through `connectBotTelegram` / `disconnectBotTelegram` and `syncPostMutationTelegramState`). Token field uses `type="password"`. The 4-step BotFather guide reads `step1..step4` keys from i18n (verified present in both EN and AR). Good.

---

## Settings rail wiring quick check

`SECTION_META` (`ZakiSettingsSheet.tsx:326-332`) declares 5 entries: `identity`, `responseStyle`, `channels`, `autonomy`, `plan`. The render block (`:1266-1835`) renders all 5 corresponding `activeSection === ...` branches. `suggestedSection` (`:765-771`) only ever returns one of those 5 ids. `setActiveSection` is bound to `onSelect={setActiveSection}` (`:1260`). All 5 wire correctly.

---

## Compaction-meter chain quick check

Confirmed end-to-end:

1. Backend agent → `/api/agent/sessions/{key}/context` → `fetchAgentSessionContext` (`src/lib/api.ts:1794-1802`).
2. `refreshContextGauge` (`ChatArea.tsx:2938-2960`) extracts `context_pressure_percent` (or fallback `context_window_used_pct`) and calls `setSessionContextPressure(sessionKey, pressurePct)`.
3. Store `setContextPressure` (`zakiSessionUiStore.ts:214-227`) writes `contextPressurePercent` and derives `contextPressureState`.
4. `ChatArea` reads `activeSessionUi?.contextPressurePercent` from the store (`ChatArea.tsx:2088-2094, 6216-6222`) and passes it as `zakiContextPressurePercent` to `<InputArea>`.
5. `InputArea` (`InputArea.tsx:142-152`) renders the ring with `Math.max(0, Math.min(100, Math.round(zakiContextPressurePercent ?? 0)))`.

The chain itself is sound. The two failure modes are P1-01 (transient hiccup zeroes the meter) and P2-05 (`null` collapses to 0% at bootstrap). Other than those, the meter does mirror backend pressure now.

---

## Things I checked and found clean

- The 15s polling effect cleanup (`ChatArea.tsx:2984-2998`) — the `clearInterval` runs on unmount and on dep change. StrictMode double-fire does not leak.
- `mapAgentSessionToZakiSessionUi` correctly omits both `contextPressurePercent` and `contextPressureState` when source is silent (`zakiSessionUiStore.ts:87-90`), and `hydrateSession` (`:139-154`) preserves prior values via `patch.contextPressurePercent ?? state.sessions[normalized]?.contextPressurePercent ?? null` plus the `...patch` spread skipping absent keys.
- `Sidebar.tsx:2241-2244` invokes `<ZakiSettingsSheet>` with the right two props; no dangling props.
- AR i18n parity for the new keys (`channelsList.*`, `telegram.guide.*`, `rail.*`, `placeholders.navAria`, `voiceReplies.connectTelegram*`, `privacy.footer`, channel pill states) — all present in `ar.json`.
- TierBadge live tiers (`free`, `personal`, `student`, `pro`, `codeActive`) all map to `sidebar.profile.planBadge.*` which exists in both locales (`en.json:173-179`).
- Telegram setup form renders inside the `channels` rail, the connect/disconnect buttons call the bot endpoints (`connectBotTelegram` / `disconnectBotTelegram`), and the post-mutation polling at `syncPostMutationTelegramState` (`:773-828`) is preserved from before the refactor.
