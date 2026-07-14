import { useBrainMemory } from "@/queries";
import { KIND_LABEL } from "../brainColors";
import { brainDisplayText, sanitizeBrainText } from "../brainText";

export interface BrainDetailPanelProps {
  userId: string;
  /** Memory key of the focused node, or null when nothing is focused. */
  memoryKey: string | null;
  onClose: () => void;
}

// Right-rail memory detail for the focused node — real M3 data via useBrainMemory
// (summary, content, source snippet, supersession history, connected memories).
// Blocks with no backing data are omitted rather than faked.
export function BrainDetailPanel({ userId, memoryKey, onClose }: BrainDetailPanelProps) {
  const { data, isLoading, isError } = useBrainMemory(userId, memoryKey);
  if (!memoryKey) return null;
  const stableKey = data?.key ?? data?.id ?? memoryKey;
  const displayKey = brainDisplayText(stableKey, "Memory");
  const summary = sanitizeBrainText(data?.summary);
  const content = sanitizeBrainText(data?.content);
  const sourceSnippet = sanitizeBrainText(data?.source?.snippet);

  return (
    <aside className="zaki-galaxy-detail" data-testid="brain-galaxy-detail" aria-label="Memory detail">
      <header className="zaki-galaxy-detail__head">
        <span className="zaki-galaxy-detail__tag">
          {data ? KIND_LABEL[data.kind] ?? data.kind : "Memory"}
        </span>
        <button
          type="button"
          className="zaki-galaxy-detail__close"
          aria-label="Close detail"
          onClick={onClose}
        >
          ✕
        </button>
      </header>

      {isLoading ? (
        <p className="zaki-galaxy-detail__muted">Loading…</p>
      ) : isError ? (
        <p className="zaki-galaxy-detail__muted">Couldn’t load this memory.</p>
      ) : !data ? (
        <p className="zaki-galaxy-detail__muted">This memory is no longer available.</p>
      ) : (
        <div className="zaki-galaxy-detail__body">
          <h3 className="zaki-galaxy-detail__title">
            {brainDisplayText(summary, content, data.id, "Memory")}
          </h3>

          {/* Executive brief: when ZAKI learned this + how sure it is — the
              trust signals that matter for an AI-authored memory. */}
          <div className="zaki-galaxy-detail__meta">
            {(() => {
              const learnedTs = data.source?.timestamp ?? data.created_at;
              return learnedTs ? <span>Learned {formatAge(learnedTs)}</span> : null;
            })()}
            {confidenceLabel(data.confidence_score) ? (
              <span>· {confidenceLabel(data.confidence_score)}</span>
            ) : null}
            {data.valid_to != null ? (
              <span className="zaki-galaxy-detail__badge">superseded</span>
            ) : null}
          </div>

          <section className="zaki-galaxy-detail__section">
            <span className="zaki-galaxy-detail__label">Memory key</span>
            <div className="zaki-galaxy-detail__key-row">
              <code>{displayKey}</code>
              <button type="button" onClick={() => copyMemoryKey(displayKey)}>
                Copy
              </button>
            </div>
          </section>

          {content && content !== summary ? (
            <section className="zaki-galaxy-detail__section">
              <span className="zaki-galaxy-detail__label">Content</span>
              <p className="zaki-galaxy-detail__prose">{content}</p>
            </section>
          ) : null}

          {sourceSnippet ? (
            <section className="zaki-galaxy-detail__section">
              <span className="zaki-galaxy-detail__label">Where this came from</span>
              <blockquote className="zaki-galaxy-detail__quote">{sourceSnippet}</blockquote>
            </section>
          ) : null}

          {data.valid_history && data.valid_history.length > 0 ? (
            <section className="zaki-galaxy-detail__section">
              <span className="zaki-galaxy-detail__label">History · {data.valid_history.length}</span>
              <ul className="zaki-galaxy-detail__chain">
                {data.valid_history.slice(0, 6).map((step, i) => (
                  <li key={`${step.valid_from}-${i}`}>
                    <span className="zaki-galaxy-detail__when">{formatAge(step.valid_from)}</span>
                    {brainDisplayText(step.content, "Memory")}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.linked_memories && data.linked_memories.length > 0 ? (
            <section className="zaki-galaxy-detail__section">
              <span className="zaki-galaxy-detail__label">
                Connected · {data.linked_memories.length}
              </span>
              <ul className="zaki-galaxy-detail__links">
                {data.linked_memories.slice(0, 8).map((memory, i) => (
                  <li key={memory.id ?? `${memory.link_type}-${i}`}>
                    <span className="zaki-galaxy-detail__rel">{memory.link_type}</span>
                    {brainDisplayText(memory.summary, "Memory")}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </aside>
  );
}

// Confidence score → plain words (an AI-memory should say how sure it is, not
// show a raw 0–1). null when no score so the brief stays clean.
function confidenceLabel(score: number | undefined): string | null {
  if (typeof score !== "number") return null;
  if (score >= 0.8) return "high confidence";
  if (score >= 0.5) return "medium confidence";
  return "low confidence";
}

function copyMemoryKey(key: string) {
  if (typeof navigator === "undefined") return;
  const result = navigator.clipboard?.writeText(key);
  if (result) void result.catch(() => undefined);
}

function formatAge(ts: number): string {
  const ms = ts > 1e12 ? ts : ts * 1000; // tolerate seconds or milliseconds
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (!Number.isFinite(days) || days < 0) return "";
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`;
}

export default BrainDetailPanel;
