# ZAKI Learn Native API Contract

Last updated: May 7, 2026

## Scope

This is the browser-facing product API for ZAKI Learn. The browser calls only
`/api/learning/*` on the ZAKI backend. The downstream learning engine remains an
internal service and is reached only by the ZAKI backend using
`X-Internal-Token` and `X-Zaki-User-Id`.

The implementation source is the learning engine FastAPI surface under
`/api/v1/*`, but the supported product contract is the ZAKI API below. Normal
users never see or configure raw provider, model, API-key, base-url, deployment,
backup, retention, or internal-token settings.

## Auth

- Browser requests use the normal ZAKI bearer token/session flow.
- ZAKI backend resolves the canonical user id from central auth.
- ZAKI backend forwards the request to the learning engine with:
  - `X-Internal-Token: <operator secret>`
  - `X-Zaki-User-Id: <canonical ZAKI user id>`
  - `X-Request-Id: <request id>`
- Learning engine data paths are tenant-scoped by the forwarded ZAKI user id.
- Browser-supplied `X-Internal-Token`, `X-Zaki-User-Id`, `provider`, `model`,
  `api_key`, `base_url`, and equivalent routing fields are stripped or ignored.

## Versioning

The current product contract is additive under `/api/learning/*`.

Breaking changes require one of:

- a new path prefix, for example `/api/learning/v2/*`
- a migration window with dual support
- a compatibility adapter in `src/lib/learningApi.ts`

The learning engine may change internally as upstream updates are mirrored, but
ZAKI frontend callers must continue to use this product API.

## Errors

ZAKI Learn errors use HTTP semantics and a machine-readable payload:

```json
{
  "code": "learning_unavailable",
  "error": "Learning is unavailable.",
  "message": "Learning is temporarily unavailable.",
  "retryable": true,
  "requestId": "req_..."
}
```

Rules:

- `401`: browser auth missing or invalid.
- `403`: authenticated user lacks the required entitlement/admin role.
- `404`: learning disabled or resource not found.
- `409`: conflicting write or job state.
- `413`: request or upload exceeds hosted limits.
- `429`: quota exceeded; quota headers should be present.
- `502`: upstream learning engine failed or rejected internal auth.
- `503`: learning engine temporarily unavailable.

## Pagination

List endpoints must accept bounded pagination where the upstream surface
supports it. Current offset-based compatibility is allowed for mirrored
DeepTutor routes, but new ZAKI-native lists should prefer cursor pagination:

```text
GET /api/learning/sessions?limit=50&cursor=<opaque>
```

Hard bounds:

- default list limit: `50`
- maximum list limit: `100`, unless a route-specific lower cap is documented
- no unbounded "return all" endpoints for production user data

## Idempotency And Concurrency

Expensive creation/action routes should accept `Idempotency-Key` before broad
paid rollout, especially:

- book generation
- question generation
- deep solve
- deep research
- visualization
- math animation
- knowledge indexing/reindexing

Current DeepTutor-compatible action endpoints are non-idempotent unless stated
otherwise. The ZAKI BFF must keep quota accounting and request logging at the
ingress boundary so retries are auditable.

## Operator AI Stack

LLM, embedding, and search routing are operator-managed only.

Recommended cost-first launch stack:

```bash
ZAKI_LEARNING_LLM_PROVIDER=together
ZAKI_LEARNING_LLM_MODEL=moonshotai/Kimi-K2.5
ZAKI_LEARNING_EMBEDDING_PROVIDER=together
ZAKI_LEARNING_EMBEDDING_MODEL=intfloat/multilingual-e5-large-instruct
ZAKI_LEARNING_SEARCH_PROVIDER=brave
```

Learning engine runtime equivalent:

```bash
LLM_BINDING=together
LLM_HOST=https://api.together.xyz/v1
LLM_MODEL=moonshotai/Kimi-K2.5
LLM_API_KEY=<operator secret>

EMBEDDING_BINDING=together
EMBEDDING_HOST=https://api.together.xyz/v1/embeddings
EMBEDDING_MODEL=intfloat/multilingual-e5-large-instruct
EMBEDDING_API_KEY=<operator secret>

SEARCH_PROVIDER=brave
SEARCH_API_KEY=<operator secret>
```

`/api/internal/learning/deployment-readiness` must report
`operator_ai_stack_configured=true` before broad paid-user rollout.

## REST Surface

### Health And Sessions

| ZAKI API | Upstream engine | Purpose |
| --- | --- | --- |
| `GET /api/learning/health` | `GET /readyz` | User-visible learning availability probe |
| `GET /api/learning/sessions` | `GET /api/v1/sessions` | List learning sessions |
| `GET /api/learning/sessions/:sessionId` | `GET /api/v1/sessions/:sessionId` | Session detail |
| `PATCH /api/learning/sessions/:sessionId` | `PATCH /api/v1/sessions/:sessionId` | Rename/update session metadata |
| `DELETE /api/learning/sessions/:sessionId` | `DELETE /api/v1/sessions/:sessionId` | Delete session |
| `POST /api/learning/sessions/:sessionId/quiz-results` | `POST /api/v1/sessions/:sessionId/quiz-results` | Store quiz result metadata |

### Books

| ZAKI API | Upstream engine | Purpose |
| --- | --- | --- |
| `GET /api/learning/books` | `GET /api/v1/book/books` | List books |
| `POST /api/learning/books` | `POST /api/v1/book/books` | Generate proposal from intent and sources |
| `GET /api/learning/books/:bookId` | `GET /api/v1/book/books/:bookId` | Book detail |
| `DELETE /api/learning/books/:bookId` | `DELETE /api/v1/book/books/:bookId` | Delete book |
| `GET /api/learning/books/:bookId/spine` | `GET /api/v1/book/books/:bookId/spine` | Book spine |
| `GET /api/learning/books/:bookId/pages/:pageId` | `GET /api/v1/book/books/:bookId/pages/:pageId` | Page content |
| `POST /api/learning/books/confirm-proposal` | `POST /api/v1/book/books/confirm-proposal` | Confirm/edit proposal |
| `POST /api/learning/books/confirm-spine` | `POST /api/v1/book/books/confirm-spine` | Confirm/edit spine |
| `POST /api/learning/books/compile-page` | `POST /api/v1/book/books/compile-page` | Compile a page |
| `POST /api/learning/books/regenerate-block` | `POST /api/v1/book/books/regenerate-block` | Regenerate a block |
| `POST /api/learning/books/insert-block` | `POST /api/v1/book/books/insert-block` | Insert a block |
| `POST /api/learning/books/delete-block` | `POST /api/v1/book/books/delete-block` | Delete a block |
| `POST /api/learning/books/move-block` | `POST /api/v1/book/books/move-block` | Reorder a block |
| `POST /api/learning/books/change-block-type` | `POST /api/v1/book/books/change-block-type` | Change a block type |
| `POST /api/learning/books/deep-dive` | `POST /api/v1/book/books/deep-dive` | Create deeper lesson content |
| `POST /api/learning/books/quiz-attempt` | `POST /api/v1/book/books/quiz-attempt` | Record quiz attempt/remediation |
| `POST /api/learning/books/supplement` | `POST /api/v1/book/books/supplement` | Generate supplement |
| `POST /api/learning/books/page-chat-session` | `POST /api/v1/book/books/page-chat-session` | Link page chat session |
| `POST /api/learning/books/rebuild` | `POST /api/v1/book/books/rebuild` | Rebuild book content |

### Knowledge Sources

| ZAKI API | Upstream engine | Purpose |
| --- | --- | --- |
| `GET /api/learning/knowledge/supported-file-types` | `GET /api/v1/knowledge/supported-file-types` | Upload policy |
| `GET /api/learning/knowledge/list` | `GET /api/v1/knowledge/list` | List source libraries |
| `POST /api/learning/knowledge/create` | `POST /api/v1/knowledge/create` | Create library with files |
| `POST /api/learning/knowledge/:kbName/upload` | `POST /api/v1/knowledge/:kbName/upload` | Upload files |
| `POST /api/learning/knowledge/:kbName/upload-folder` | `POST /api/v1/knowledge/:kbName/upload` | Browser folder upload compatibility |
| `POST /api/learning/knowledge/:kbName/upload-archive` | `POST /api/v1/knowledge/:kbName/upload` | Archive upload compatibility |
| `POST /api/learning/knowledge/:kbName/reindex` | `POST /api/v1/knowledge/:kbName/reindex` | Rebuild vector index |
| `GET /api/learning/knowledge/:kbName` | `GET /api/v1/knowledge/:kbName` | Library detail |
| `DELETE /api/learning/knowledge/:kbName` | `DELETE /api/v1/knowledge/:kbName` | Delete library |
| `GET /api/learning/knowledge/:kbName/files` | `GET /api/v1/knowledge/:kbName/files` | List uploaded files |
| `GET /api/learning/knowledge/:kbName/files/:filename` | `GET /api/v1/knowledge/:kbName/files/:filename` | File metadata/content |
| `GET /api/learning/knowledge/:kbName/progress` | `GET /api/v1/knowledge/:kbName/progress` | Index progress |
| `POST /api/learning/knowledge/:kbName/progress/clear` | `POST /api/v1/knowledge/:kbName/progress/clear` | Clear progress state |

Hosted ZAKI does not expose upstream local filesystem `link-folder` routes.
Connector-backed folder linking is a V1.1 API extension.

### Notebooks, Questions, Co-Writer, Space, And Tutor Agents

These groups are also first-class ZAKI product routes:

- `/api/learning/notebooks/*`
- `/api/learning/questions/*`
- `/api/learning/co-writer/*`
- `/api/learning/memory*`
- `/api/learning/skills*`
- `/api/learning/solve/*`
- `/api/learning/vision/*`
- `/api/learning/tutor-agents/*`

All mutation bodies are sanitized recursively before proxying. Tutor agent
channels are allowlisted to WhatsApp, Telegram, Discord, Email, and Slack.

## WebSockets

Browser clients authenticate using the `zaki.learning.v1` subprotocol plus a
fresh ZAKI JWT subprotocol:

```text
new WebSocket(url, ["zaki.learning.v1", "zaki.jwt.<token>"])
```

Supported routes:

| ZAKI WS | Upstream engine WS |
| --- | --- |
| `/api/learning/ws` | `/api/v1/ws` |
| `/api/learning/book/ws` | `/api/v1/book/ws` |
| `/api/learning/chat/ws` | `/api/v1/chat` |
| `/api/learning/solve/ws` | `/api/v1/solve` |
| `/api/learning/vision/solve/ws` | `/api/v1/vision/solve` |
| `/api/learning/questions/mimic/ws` | `/api/v1/question/mimic` |
| `/api/learning/questions/generate/ws` | `/api/v1/question/generate` |
| `/api/learning/tutor-agents/:agentId/ws` | `/api/v1/tutorbot/:agentId/ws` |

Quota is consumed on actual prompt/mutating messages, not passive subscription
or heartbeat messages.

## Internal Operator Routes

Super-admin only:

- `GET /api/internal/learning/status`
- `GET /api/internal/learning/retention`
- `POST /api/internal/learning/retention/cleanup`
- `GET /api/internal/learning/disaster-recovery`
- `GET /api/internal/learning/deployment-readiness`

These routes may report provider/model names and readiness booleans, but must
never return API keys, internal tokens, raw secrets, or user tenant data.

