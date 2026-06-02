import { useBrainMemory } from "@/queries";
import { KIND_LABEL } from "../brainColors";

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
          <h3 className="zaki-galaxy-detail__title">{data.summary || data.content || data.id}</h3>

          <div className="zaki-galaxy-detail__meta">
            {typeof data.importance_score === "number" ? (
              <span>score {data.importance_score.toFixed(2)}</span>
            ) : null}
            {typeof data.confidence_score === "number" ? (
              <span>· conf {data.confidence_score.toFixed(2)}</span>
            ) : null}
            {data.created_at ? <span>· {formatAge(data.created_at)}</span> : null}
            {data.valid_to != null ? (
              <span className="zaki-galaxy-detail__badge">archived</span>
            ) : null}
          </div>

          {data.content && data.content !== data.summary ? (
            <section className="zaki-galaxy-detail__section">
              <span className="zaki-galaxy-detail__label">Content</span>
              <p className="zaki-galaxy-detail__prose">{data.content}</p>
            </section>
          ) : null}

          {data.source?.snippet ? (
            <section className="zaki-galaxy-detail__section">
              <span className="zaki-galaxy-detail__label">Source</span>
              <blockquote className="zaki-galaxy-detail__quote">{data.source.snippet}</blockquote>
            </section>
          ) : null}

          {data.valid_history && data.valid_history.length > 0 ? (
            <section className="zaki-galaxy-detail__section">
              <span className="zaki-galaxy-detail__label">History · {data.valid_history.length}</span>
              <ul className="zaki-galaxy-detail__chain">
                {data.valid_history.slice(0, 6).map((step, i) => (
                  <li key={`${step.valid_from}-${i}`}>
                    <span className="zaki-galaxy-detail__when">{formatAge(step.valid_from)}</span>
                    {step.content}
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
                    {memory.summary}
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
