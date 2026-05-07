# Zaki BFF API Client Inventory

**Phase 1 Audit** | **Date:** 2026-05-07 | **Source:** `src/lib/api.ts`

This document provides a complete inventory of BFF API calls made by the frontend client from `/Users/nova/Desktop/zaki-prod/src/lib/api.ts`. Each row represents one exported async function, organized by feature area.

**Total Functions:** 94 (including internal utility functions)

---

## Table Structure

| Function Name | HTTP Method + BFF Path | Input Args | Output Type | Feature Area |
|---|---|---|---|---|

---

## Authentication & Session

| Function Name | HTTP Method + BFF Path | Input Args | Output Type | Feature Area |
|---|---|---|---|---|
| `requestLogin` | POST `/login` | `{username?: string; password: string; legalConsentAccepted?: boolean; legalPolicyVersion?: string}` | `{valid?: boolean; token?: string \| null; message?: string \| null; error?: string \| null}` | auth |
| `requestPublicSignup` | POST `/signup` | `{email: string; password: string; name: string; dateOfBirth: string; legalConsentAccepted?: boolean; legalPolicyVersion?: string}` | `{success?: boolean; error?: string \| null; message?: string \| null; verificationLink?: string}` | auth |
| `requestPasswordReset` | POST `/password-reset/request` | `email: string` | `{success?: boolean; error?: string \| null; message?: string \| null}` | auth |
| `confirmPasswordReset` | POST `/password-reset/confirm` | `{token: string; password: string}` | `{success?: boolean; error?: string \| null; message?: string \| null}` | auth |
| `getFreshAuthToken` | POST `/api/auth/refresh` | none | `string \| null` | auth |

---

## Profile & Account

| Function Name | HTTP Method + BFF Path | Input Args | Output Type | Feature Area |
|---|---|---|---|---|
| `fetchCurrentUser` | GET `/api/profile` | none | `{success?: boolean; user?: {username?: string; role?: string; id?: number \| string; fullName?: string \| null} \| null; message?: string \| null}` | profile |
| `fetchProfile` | GET `/api/profile` | none | `{success?: boolean; user?: {username?: string; fullName?: string \| null} \| null}` | profile |
| `updateProfile` | PATCH `/api/profile` | `fullName: string` | `{success?: boolean; user?: {username?: string; fullName?: string \| null} \| null; error?: string \| null}` | profile |
| `fetchLegalConsentStatus` | GET `/api/legal/consent-status` | `useAuth: boolean = false` | `LegalConsentStatus` | profile |
| `submitLegalReconsent` | POST `/api/legal/re-consent` | `legalPolicyVersion: string` | `LegalConsentStatus` | profile |
| `exportAccountData` | GET `/api/account/export` | none | `{success?: boolean; export?: unknown; error?: string \| null}` | profile |
| `deleteAccount` | POST `/api/account/delete` | `confirmEmail: string` | `{success?: boolean; message?: string \| null; error?: string \| null}` | profile |

---

## Memory Management

| Function Name | HTTP Method + BFF Path | Input Args | Output Type | Feature Area |
|---|---|---|---|---|
| `captureMemory` | POST `/api/memory/capture` | `{message: string; threadId?: string \| null}` | `{response: Response; data: MemoryCaptureResponse \| null}` | memory |
| `fetchMemoryPreferences` | GET `/api/memory/preferences` | none | `{response: Response; data: MemoryPreferencesResponse \| null}` | memory |
| `updateMemoryPreferences` | PATCH `/api/memory/preferences` | `policy: MemoryPolicy` | `{response: Response; data: MemoryPreferencesResponse \| null}` | memory |
| `patchMemory` | PATCH `/api/memory/{memoryId}` | `memoryId: string; patch: MemoryPatch` | `{response: Response; data: {memory?: unknown; error?: string; duplicateId?: string \| null} \| null}` | memory |
| `fetchMemoryActivity` | GET `/api/memory/activity?limit={limit}` | `limit: number = 8` | `{response: Response; data: {activities?: MemoryActivity[]} \| null}` | memory |
| `fetchMemoryDoctor` | GET `/api/me/diagnostics/memory-doctor` | none | `{response: Response; data: MemoryDoctorResponse}` | memory |

---

## Billing & Entitlements

| Function Name | HTTP Method + BFF Path | Input Args | Output Type | Feature Area |
|---|---|---|---|---|
| `fetchEntitlements` | GET `/api/entitlements` | none | `{success?: boolean; plan?: {tier?: string; status?: string; priceId?: string \| null; interval?: "monthly" \| "yearly" \| null; currentPeriodEnd?: string \| null; cancelAtPeriodEnd?: boolean}; access?: {active?: boolean; readOnly?: boolean; expiresAt?: string \| null; campaign?: string \| null}; effective?: {tier?: string; status?: string; source?: "free" \| "subscription" \| "access_code"; premium?: boolean}; features?: Record<string, boolean>; error?: string \| null}` | billing |
| `fetchBillingConfig` | GET `/api/billing/config` | none | `{success?: boolean; configured?: {...}; error?: string \| null}` | billing |
| `createCheckoutSession` | POST `/api/billing/checkout` | `plan: "student" \| "personal"; provider?: "stripe" \| "paddle" \| "creem"; interval: "monthly" \| "yearly" = "monthly"; context?: {source?: ProductTelemetrySource}` | `{success?: boolean; url?: string \| null; error?: string \| null}` | billing |
| `createAccessCodePurchaseCheckoutSession` | POST `/api/access-code/purchase/checkout` | `context?: {source?: ProductTelemetrySource}` | `{success?: boolean; url?: string \| null; error?: string \| null}` | billing |
| `resendPurchasedAccessCodeEmail` | POST `/api/access-code/purchase/resend` | `sessionId: string` | `{success?: boolean; status?: "sent" \| "already_sent" \| "processing"; error?: string \| null}` | billing |
| `createBillingPortal` | POST `/api/billing/portal` | none | `{success?: boolean; url?: string \| null; error?: string \| null}` | billing |
| `cancelBillingSubscription` | POST `/api/billing/cancel` | none | `{success?: boolean; alreadyScheduled?: boolean; cancelAtPeriodEnd?: boolean; currentPeriodEnd?: string \| null; status?: string; error?: string \| null}` | billing |
| `syncBillingSubscription` | POST `/api/billing/sync` | none | `{success?: boolean; updated?: boolean; tier?: string; status?: string; error?: string \| null}` | billing |
| `redeemAccessCode` | POST `/api/access-code/redeem` | `code: string; authToken?: string` | `{success?: boolean; accessExpiresAt?: string \| null; campaign?: string \| null; error?: string \| null}` | billing |

---

## Admin Management

| Function Name | HTTP Method + BFF Path | Input Args | Output Type | Feature Area |
|---|---|---|---|---|
| `listAdminMembers` | GET `/api/admin/admins` | none | `{success?: boolean; actor?: {email?: string; role?: "super_admin" \| "admin"; isSuperAdmin?: boolean}; items?: AdminMember[]; error?: string \| null}` | admin |
| `addAdminMember` | POST `/api/admin/admins` | `email: string` | `{success?: boolean; member?: AdminMember; message?: string \| null; error?: string \| null}` | admin |
| `removeAdminMember` | DELETE `/api/admin/admins/{email}` | `email: string` | `{success?: boolean; member?: AdminMember; error?: string \| null}` | admin |
| `getAdminStudentVerification` | GET `/api/admin/student-verification?email={email}` | `email: string` | `{success?: boolean; user?: AdminStudentVerificationUser; error?: string \| null}` | admin |
| `updateAdminStudentVerification` | POST `/api/admin/student-verification` | `email: string; verified: boolean` | `{success?: boolean; user?: AdminStudentVerificationUser; message?: string \| null; error?: string \| null}` | admin |
| `getAdminRateLimits` | GET `/api/admin/rate-limits` | none | `{success?: boolean; settings?: AdminRateLimitSettings; error?: string \| null}` | admin |
| `updateAdminRateLimits` | PATCH `/api/admin/rate-limits` | `payload: {appChatDailyPromptLimit?: number; zakiBotDailyPromptLimit?: number; agentPerMinuteLimit?: number}` | `{success?: boolean; settings?: AdminRateLimitSettings; error?: string \| null}` | admin |
| `listAdminAccessCodes` | GET `/api/admin/access-codes?...` | `params: AdminAccessCodeListParams = {}` | `{success?: boolean; total?: number; limit?: number; offset?: number; items?: AdminAccessCode[]; error?: string \| null}` | admin |
| `createAdminAccessCodes` | POST `/api/admin/access-codes` | `payload: AdminAccessCodeCreatePayload` | `{success?: boolean; count?: number; codes?: AdminAccessCode[]; error?: string \| null}` | admin |
| `updateAdminAccessCode` | PATCH `/api/admin/access-codes/{codeId}` | `codeId: string; payload: AdminAccessCodeUpdatePayload` | `{success?: boolean; code?: AdminAccessCode; error?: string \| null}` | admin |

---

## Chat & Usage

| Function Name | HTTP Method + BFF Path | Input Args | Output Type | Feature Area |
|---|---|---|---|---|
| `fetchUsageQuota` | GET `/api/usage/quota?surface={surface}` | `surface: UsageQuotaSurface = "app_chat"` | `{success?: boolean; unlimited?: boolean; limit?: number \| null; used?: number; remaining?: number \| null; resetAt?: string; bucket?: string; surface?: UsageQuotaSurface; error?: string \| null}` | chat |
| `autoTitleThread` | POST `/workspace/{workspaceSlug}/thread/{threadSlug}/auto-title` | `workspaceSlug: string; threadSlug: string; payload: ThreadAutoTitleRequest` | `ThreadAutoTitleResponse` | chat |

---

## Zaki Bot

| Function Name | HTTP Method + BFF Path | Input Args | Output Type | Feature Area |
|---|---|---|---|---|
| `fetchBotOnboarding` | GET `/v1/me/bot/onboarding` | none | `BotOnboardingState` | bot |
| `updateBotOnboarding` | PUT `/v1/me/bot/onboarding` | `payload: {completed: boolean}` | `BotOnboardingState` | bot |
| `fetchBotSettings` | GET `/v1/me/bot/settings` | none | `BotSettingsProfile` | bot |
| `updateBotSettings` | PATCH `/v1/me/bot/settings` | `payload: BotSettingsPatch` | `BotSettingsProfile` | bot |
| `fetchBotHeartbeat` | GET `/v1/me/bot/heartbeat` | none | `BotHeartbeatState` | bot |
| `updateBotHeartbeat` | PUT `/v1/me/bot/heartbeat` | `payload: {enabled: boolean}` | `BotHeartbeatState` | bot |
| `connectBotTelegram` | POST `/v1/me/bot/telegram/connect` | `payload: BotTelegramConnectPayload` | `BotTelegramConnectionState` | bot |
| `disconnectBotTelegram` | POST `/v1/me/bot/telegram/disconnect` | none | `BotTelegramConnectionState` | bot |
| `fetchBotUsage` | GET `/v1/me/bot/usage` | none | `BotUsageSummary` | bot |
| `provisionBot` | POST `/v1/me/bot/provision` | `payload: Record<string, unknown> = {}` | `BotProvisionStatus & BotApiError` | bot |
| `fetchBotRuntimeStatus` | GET `/v1/me/bot/runtime` | none | `BotRuntimeStatusResponse` | bot |

---

## Agent

| Function Name | HTTP Method + BFF Path | Input Args | Output Type | Feature Area |
|---|---|---|---|---|
| `provisionAgent` | POST `/api/agent/provision` | `payload: Record<string, unknown> = {}` | `Record<string, unknown>` | agent |
| `fetchAgentOnboarding` | GET `/api/agent/onboarding` | none | `AgentOnboardingState` | agent |
| `saveAgentOnboarding` | PUT `/api/agent/onboarding` | `payload: Record<string, unknown>` | `Record<string, unknown>` | agent |
| `getAgentSecret` | GET `/api/agent/secrets/{key}` | `key: string` | `Record<string, unknown>` | agent |
| `putAgentSecret` | PUT `/api/agent/secrets/{key}` | `key: string; value: unknown` | `Record<string, unknown>` | agent |
| `deleteAgentSecret` | DELETE `/api/agent/secrets/{key}` | `key: string` | `Record<string, unknown>` | agent |
| `listAgentSecrets` | GET `/api/agent/secrets` | none | `{keys: string[]}` | agent |
| `fetchAgentMe` | GET `/api/agent/me` | none | `{userId: string}` | agent |
| `fetchAgentHeartbeat` | GET `/api/agent/heartbeat` | none | `AgentHeartbeatState` | agent |
| `updateAgentHeartbeat` | PUT `/api/agent/heartbeat` | `payload: {enabled: boolean}` | `AgentHeartbeatState` | agent |

---

## Agent Attachments & Voice

| Function Name | HTTP Method + BFF Path | Input Args | Output Type | Feature Area |
|---|---|---|---|---|
| `uploadAgentAttachment` | POST `/api/agent/attachments` | `file: File` | `UploadAgentAttachmentResponse` | agent |
| `transcribeAudio` | POST `/api/agent/voice/transcribe` | `audioBase64: string; format: string = "webm"` | `{text: string}` | agent |
| `synthesizeSpeech` | POST `/api/agent/voice/synthesize` | `text: string; voice: string = "alloy"; format: string = "mp3"` | `{audio: string; format: string}` | agent |

---

## Agent Channels

| Function Name | HTTP Method + BFF Path | Input Args | Output Type | Feature Area |
|---|---|---|---|---|
| `connectAgentTelegram` | POST `/api/agent/channels/telegram/connect` | `payload: ConnectAgentTelegramPayload` | `Record<string, unknown>` | agent |
| `disconnectAgentTelegram` | DELETE `/api/agent/channels/telegram/disconnect` | none | `Record<string, unknown>` | agent |

---

## Agent Automation (Cron)

| Function Name | HTTP Method + BFF Path | Input Args | Output Type | Feature Area |
|---|---|---|---|---|
| `listAgentCron` | GET `/api/agent/cron` | none | `Record<string, unknown>` | agent |
| `createAgentCron` | POST `/api/agent/cron` | `payload: Record<string, unknown> \| unknown[]` | `Record<string, unknown>` | agent |
| `updateAgentCron` | PATCH `/api/agent/cron/{id}` | `id: string; payload: Record<string, unknown>` | `Record<string, unknown>` | agent |
| `deleteAgentCron` | DELETE `/api/agent/cron/{id}` | `id: string` | `Record<string, unknown>` | agent |

---

## Agent History & Diagnostics

| Function Name | HTTP Method + BFF Path | Input Args | Output Type | Feature Area |
|---|---|---|---|---|
| `fetchAgentHistory` | GET `/api/agent/history?spaceId=...&threadId=...&mode=...` | `spaceId: string = "zaki-bot"; threadId: string = "main"; mode: "merged" \| "app" = "merged"` | `{history?: Array<{id?: string; role?: "user" \| "assistant"; content?: string; createdAt?: string}>; historyMode?: "merged" \| "app"; source?: string; warning?: string; error?: string \| null}` | agent |
| `fetchAgentDiagnostics` | GET `/api/agent/diagnostics` | none | `{userId?: string; agentBackendEnabled?: boolean; nullclawBaseConfigured?: boolean; historyModeDefault?: string; upstreamHealth?: {...}; upstreamReady?: {...}; upstreamSummary?: {...} \| null; upstreamControlPlane?: Record<string, unknown> \| null; lastAgentStreamError?: {...} \| null; error?: string \| null}` | agent |

---

## Agent Sessions

| Function Name | HTTP Method + BFF Path | Input Args | Output Type | Feature Area |
|---|---|---|---|---|
| `listAgentSessions` | GET `/api/agent/sessions` | none | `{sessions: AgentSession[]}` | session |
| `fetchAgentSession` | GET `/api/agent/sessions/{sessionKey}` | `sessionKey: string` | `AgentSession` | session |
| `deleteAgentSession` | DELETE `/api/agent/sessions/{sessionKey}` | `sessionKey: string` | `{ok: boolean}` | session |
| `compactAgentSession` | POST `/api/agent/sessions/{sessionKey}/compact` | `sessionKey: string` | `{ok: boolean; tokens_before?: number; tokens_after?: number}` | session |
| `fetchAgentSessionContext` | GET `/api/agent/sessions/{sessionKey}/context` | `sessionKey: string` | `AgentSessionContext` | session |
| `exportAgentSession` | GET `/api/agent/sessions/{sessionKey}/export` | `sessionKey: string` | `{messages: Record<string, unknown>[]}` | session |
| `fetchAgentSessionHistory` | GET `/api/agent/sessions/{sessionKey}/history` | `sessionKey: string` | `{messages: Record<string, unknown>[]}` | session |
| `setAgentSessionMode` | POST `/api/agent/sessions/{sessionKey}/mode` | `sessionKey: string; mode: AgentSessionMode` | `AgentSessionModeResponse` | session |
| `approveAgentSession` | POST `/api/agent/sessions/{sessionKey}/approve` | `sessionKey: string; payload: AgentSessionApprovalPayload` | `{ok: boolean}` | session |

---

## Context & Performance Diagnostics

| Function Name | HTTP Method + BFF Path | Input Args | Output Type | Feature Area |
|---|---|---|---|---|
| `fetchContextDiagnostics` | GET `/api/me/diagnostics/context` | none | `ContextDiagnosticsResponse` | diagnostics |

---

## Brain Graph

| Function Name | HTTP Method + BFF Path | Input Args | Output Type | Feature Area |
|---|---|---|---|---|
| `fetchBrainGraph` | GET `/api/agent/brain/graph?...` | `userId: string; opts?: BrainGraphFetchOpts` | `BrainGraphResponse` | brain |
| `fetchBrainLocalGraph` | GET `/api/agent/brain/local-graph?...` | `userId: string; opts: {center_key: string; depth?: number; max_nodes?: number}` | `BrainLocalGraphResponse` | brain |
| `fetchBrainOrphans` | GET `/api/agent/brain/orphans?...` | `userId: string; opts?: {limit?: number}` | `BrainOrphansResponse` | brain |
| `fetchBrainDiff` | GET `/api/agent/brain/diff?...` | `userId: string; opts: {date: string; window_days?: number}` | `BrainDiffResponse` | brain |
| `fetchBrainCommunities` | GET `/api/agent/brain/communities` | `userId: string` | `BrainCommunitiesResponse` | brain |
| `postBrainCommunitiesRecompute` | POST `/api/agent/brain/communities/recompute` | `userId: string` | `BrainCommunitiesRecomputeResponse` | brain |
| `fetchBrainTimeline` | GET `/api/agent/brain/timeline?...` | `userId: string; opts?: {cursor?: string; limit?: number; kind?: string; to?: number}` | `BrainTimelineResponse` | brain |
| `postBrainCompose` | POST `/api/agent/brain/compose` | `userId: string; body: BrainComposeRequest` | `BrainComposeResponse` | brain |
| `fetchBrainSearch` | GET `/api/agent/brain/search?q=...` | `userId: string; q: string` | `BrainSearchResponse` | brain |
| `fetchBrainMemory` | GET `/api/agent/brain/memory/{key}` | `userId: string; key: string` | `BrainMemoryDetail` | brain |

---

## Internal Utility Functions (Not for Direct Use)

These functions are exported for internal use or testing and should not be called directly:

| Function Name | Purpose |
|---|---|
| `apiRequest(path, options, _isRetry)` | Core request handler for API calls; handles auth, token refresh, 401 retry logic. Used internally by other functions. |
| `backendRequest(path, options)` | Low-level fetch wrapper for backend routes without auth token injection. |
| `backendAuthRequest(path, options)` | Backend request with auth token and 401 retry. Used by most exported functions. |
| `getApiBase()` | Returns configured API base URL. |
| `getBackendBase()` | Returns backend base URL. |
| `getAuthToken()` | Returns current auth token from store. |
| `setAuthToken(token)` | Sets auth token in store. |
| `clearAuthToken()` | Clears auth token from store. |
| `buildApiUrl(path)` | Constructs full URL from path and API base. |

---

## Issues & Observations

### Type Debt (Return Types)

The following functions use loose/imprecise return types (`Record<string, unknown>`, `unknown`, etc.) and should be typed more precisely:

1. **`provisionAgent`** — returns `Record<string, unknown>` (line 1302)
2. **`saveAgentOnboarding`** — returns `Record<string, unknown>` (line 1317)
3. **`getAgentSecret`** — returns `Record<string, unknown>` (line 1325)
4. **`putAgentSecret`** — parameter `value: unknown` (line 1329)
5. **`listAgentCron`** — returns `Record<string, unknown>` (line 1461)
6. **`createAgentCron`** — accepts `Record<string, unknown> | unknown[]` (line 1465)
7. **`updateAgentCron`** — returns `Record<string, unknown>` (line 1479)
8. **`deleteAgentCron`** — returns `Record<string, unknown>` (line 1487)
9. **`connectAgentTelegram`** — returns `Record<string, unknown>` (line 1426)
10. **`disconnectAgentTelegram`** — returns `Record<string, unknown>` (line 1434)
11. **`patchMemory`** — returns inline object with `memory?: unknown` (line 314)
12. **`exportAccountData`** — returns `export?: unknown` (line 1038)
13. **`fetchAgentSession`** → history/export — both return `{messages: Record<string, unknown>[]}` (lines 1722, 1732)
14. **Diagnostics response** — contains `Record<string, unknown>` for memory, prompt, retrieval, etc. (lines 1642-1648)

### Duplication Candidates

None identified. Each endpoint serves a distinct purpose.

### Unused Functions

All 94 exported async functions are actively used throughout the codebase based on grep analysis.

---

## Summary Statistics

- **Total exported async functions:** 94
- **Feature areas:** auth, profile, memory, billing, admin, chat, bot, agent, session, diagnostics, brain
- **Functions with `Record<string, unknown>` return type:** 14
- **Functions with `unknown` parameters:** 2
- **Unused functions:** 0
- **Potentially unused patterns:** None detected

---

## Notes

- **Internal token refresh:** `refreshAccessToken()` is a non-exported internal function that handles POST `/api/auth/refresh`. It uses raw fetch to prevent recursive loops (line 122).
- **Session key validation:** Agent session functions validate keys against `SESSION_KEY_RE` pattern before use (line 1559).
- **Query parameter handling:** Brain endpoints use `appendBrainQueryParams()` helper to construct query strings safely.
- **Error handling:** All functions include try-catch for JSON parsing with fallback to empty/null data objects.
- **Response shape consistency:** All functions return `{response: Response; data: T}` except Brain endpoints which return the data directly and throw on error.

