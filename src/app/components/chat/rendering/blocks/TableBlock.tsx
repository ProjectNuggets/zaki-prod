import { InlineTextRenderer } from "../InlineTextRenderer";
import type { TableBlock as TableBlockType } from "../types";

export function TableBlock({ block }: { block: TableBlockType }) {
  return (
    <div className="overflow-x-auto rounded-[14px] border border-zaki-subtle/90 bg-[rgba(250,246,240,0.78)] dark:border-zaki-dark dark:bg-[rgba(255,255,255,0.02)]">
      <table className="min-w-full border-separate border-spacing-0 text-left rtl:text-right">
        <thead className="bg-[rgba(241,233,223,0.92)] dark:bg-[rgba(255,255,255,0.04)]">
          <tr>
            {block.headers.map((cell, index) => (
              <th
                key={`head-${index}`}
                className="border-b border-zaki-subtle/80 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:border-zaki-dark dark:text-zaki-dark-muted"
              >
                <InlineTextRenderer nodes={cell} prose />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`} className="even:bg-[rgba(255,255,255,0.45)] dark:even:bg-[rgba(255,255,255,0.015)]">
              {row.map((cell, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className="border-b border-zaki-subtle/70 px-4 py-3 text-[13px] leading-6 text-zaki-primary dark:border-zaki-dark dark:text-zaki-dark-primary"
                >
                  <InlineTextRenderer nodes={cell} prose />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
