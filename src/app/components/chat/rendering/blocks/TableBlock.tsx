import { InlineTextRenderer } from "../InlineTextRenderer";
import type { TableBlock as TableBlockType } from "../types";

export function TableBlock({ block }: { block: TableBlockType }) {
  const tableLabel = block.caption || "Agent reply table";
  return (
    <div className="zaki-message-table rounded-[8px] border border-zaki-subtle/90 bg-zaki-sunken dark:border-zaki-dark">
      {block.caption ? (
        <div className="zaki-message-table__caption" data-testid="message-table-caption">
          {block.caption}
        </div>
      ) : null}
      <div data-testid="message-table-mobile" className="zaki-message-table__mobile space-y-3 p-3 sm:hidden">
        {block.rows.map((row, rowIndex) => (
          <div
            key={`mobile-row-${rowIndex}`}
            className="overflow-hidden rounded-[6px] border border-zaki-subtle/80 bg-zaki-raised dark:border-zaki-dark"
          >
            {row.map((cell, cellIndex) => (
              <div
                key={`mobile-cell-${rowIndex}-${cellIndex}`}
                className="grid grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)] gap-3 border-b border-zaki-subtle/60 px-3 py-3 last:border-b-0 dark:border-zaki-dark"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-zaki-dark-muted">
                  <InlineTextRenderer nodes={block.headers[cellIndex] ?? []} prose />
                </div>
                <div className="min-w-0 text-[13px] leading-6 text-zaki-primary [overflow-wrap:anywhere] dark:text-zaki-dark-primary">
                  <InlineTextRenderer nodes={cell} prose />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div
        data-testid="message-table-desktop"
        className="zaki-message-table__desktop hidden overflow-x-auto sm:block"
        tabIndex={0}
        aria-label={tableLabel}
      >
        <table className="min-w-full w-max border-separate border-spacing-0 text-left rtl:text-right">
          {block.caption ? <caption className="sr-only">{block.caption}</caption> : null}
          <thead className="bg-zaki-sunken">
            <tr>
              {block.headers.map((cell, index) => (
                <th
                  key={`head-${index}`}
                  scope="col"
                  className="min-w-[10rem] border-b border-zaki-subtle/80 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:border-zaki-dark dark:text-zaki-dark-muted"
                >
                  <InlineTextRenderer nodes={cell} prose />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr
                key={`row-${rowIndex}`}
                className="even:bg-zaki-raised"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={`cell-${rowIndex}-${cellIndex}`}
                    className="min-w-[10rem] border-b border-zaki-subtle/70 px-4 py-3 align-top text-[13px] leading-6 text-zaki-primary [overflow-wrap:anywhere] dark:border-zaki-dark dark:text-zaki-dark-primary"
                  >
                    <InlineTextRenderer nodes={cell} prose />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
