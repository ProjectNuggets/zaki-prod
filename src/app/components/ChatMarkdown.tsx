import { useMemo, useState, isValidElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/atom-one-dark.css";

type HastLikeNode = {
  value?: unknown;
  children?: unknown;
};

function extractText(node: React.ReactNode): string {
  if (node === null || node === undefined) return "";
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join("");
  }
  if (isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return extractText(props.children);
  }
  if (typeof node === "object") {
    const hastNode = node as HastLikeNode;
    if (typeof hastNode.value === "string" || typeof hastNode.value === "number") {
      return String(hastNode.value);
    }
    if (hastNode.children) {
      return extractText(hastNode.children as React.ReactNode);
    }
  }
  return "";
}

function extractTableRows(node: React.ReactNode): string[][] {
  const rows: string[][] = [];
  const collectRows = (children: React.ReactNode) => {
    if (children === null || children === undefined) return;
    if (Array.isArray(children)) {
      children.forEach(collectRows);
      return;
    }
    if (isValidElement(children)) {
      const type = children.type as string;
      const props = children.props as { children?: React.ReactNode };
      if (type === "tr") {
        const cells: string[] = [];
        const rowChildren = props.children;
        if (Array.isArray(rowChildren)) {
          rowChildren.forEach((child) => {
            if (isValidElement(child)) {
              const cellProps = child.props as { children?: React.ReactNode };
              cells.push(extractText(cellProps.children));
            }
          });
        } else if (isValidElement(rowChildren)) {
          const cellProps = rowChildren.props as { children?: React.ReactNode };
          cells.push(extractText(cellProps.children));
        }
        if (cells.length > 0) rows.push(cells);
        return;
      }
      collectRows(props.children);
    }
  };
  collectRows(node);
  return rows;
}

export function ChatMarkdown({ content }: { content: string }) {
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  const components = useMemo(
    () => ({
      pre: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      p: ({ children }: { children: React.ReactNode }) => (
        <p className="mb-3 text-[15px] leading-7 text-zaki-primary dark:text-zaki-dark-primary last:mb-0">
          {children}
        </p>
      ),
      h1: ({ children }: { children: React.ReactNode }) => (
        <h1 className="mb-3 text-xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
          {children}
        </h1>
      ),
      h2: ({ children }: { children: React.ReactNode }) => (
        <h2 className="mb-3 text-[17px] font-semibold text-zaki-primary dark:text-zaki-dark-primary">
          {children}
        </h2>
      ),
      h3: ({ children }: { children: React.ReactNode }) => (
        <h3 className="mb-2 text-[15px] font-semibold text-zaki-primary dark:text-zaki-dark-primary">
          {children}
        </h3>
      ),
      ul: ({ children }: { children: React.ReactNode }) => (
        <ul className="mb-3 list-disc space-y-1 pl-5 text-[15px] leading-7 text-zaki-primary dark:text-zaki-dark-primary">
          {children}
        </ul>
      ),
      ol: ({ children }: { children: React.ReactNode }) => (
        <ol className="mb-3 list-decimal space-y-1 pl-5 text-[15px] leading-7 text-zaki-primary dark:text-zaki-dark-primary">
          {children}
        </ol>
      ),
      li: ({ children }: { children: React.ReactNode }) => (
        <li className="leading-7">{children}</li>
      ),
      a: ({
        children,
        href,
      }: {
        children: React.ReactNode;
        href?: string;
      }) => (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-zaki-brand underline underline-offset-2 hover:text-zaki-brand"
        >
          {children}
        </a>
      ),
      blockquote: ({ children }: { children: React.ReactNode }) => (
        <blockquote className="mb-3 border-l-2 border-zaki-strong pl-3 text-[15px] leading-7 text-zaki-secondary dark:text-zaki-dark-subtle">
          {children}
        </blockquote>
      ),
      code: ({
        inline,
        className,
        children,
      }: {
        inline?: boolean;
        className?: string;
        children: React.ReactNode;
      }) => {
        const text = extractText(children ?? "").replace(/\n$/, "");
        if (inline) {
          return (
            <code className="rounded-md bg-[#f6f4f1] dark:bg-[#1f1a15] px-1.5 py-0.5 font-mono text-[0.85em] text-[#8b4a3a] dark:text-[#d3b59a]">
              {text}
            </code>
          );
        }

        const classTokens =
          typeof className === "string" ? className.split(" ").filter(Boolean) : [];
        const languageToken = classTokens.find((token) =>
          token.startsWith("language-")
        );
        const fallbackToken = classTokens.find((token) => token !== "hljs");
        const rawLanguage = languageToken
          ? languageToken.replace("language-", "")
          : fallbackToken ?? "";
        const displayLanguage =
          rawLanguage && !["text", "plaintext"].includes(rawLanguage)
            ? rawLanguage.toUpperCase()
            : "CODE";
        const isEmail =
          rawLanguage.toLowerCase().includes("email") ||
          rawLanguage.toLowerCase().includes("mail");
        const key = `${rawLanguage || "code"}:${text.slice(0, 32)}`;
        const codeClassName =
          typeof className === "string"
            ? className
            : Array.isArray(className)
            ? (className as string[]).join(" ")
            : undefined;
        const shouldUseChildren =
          typeof children === "string" ||
          typeof children === "number" ||
          isValidElement(children) ||
          (Array.isArray(children) &&
            children.some(
              (child) =>
                isValidElement(child) ||
                typeof child === "string" ||
                typeof child === "number"
            ));

        const handleCopy = async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopiedBlock(key);
            window.setTimeout(() => setCopiedBlock(null), 1200);
          } catch {
            setCopiedBlock(null);
          }
        };

        return (
          <div className="my-4 overflow-hidden rounded-xl border border-zaki-subtle dark:border-zaki-dark bg-transparent">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zaki-subtle dark:border-zaki-dark bg-transparent">
              <span className="text-2xs font-semibold tracking-[0.2em] text-zaki-muted dark:text-zaki-dark-muted whitespace-nowrap">
                {displayLanguage}
              </span>
              <button
                type="button"
                className="text-2xs font-semibold text-zaki-muted dark:text-zaki-dark-muted hover:text-zaki-primary dark:hover:text-zaki-dark-primary transition-colors"
                onClick={handleCopy}
              >
                {copiedBlock === key ? "Copied" : "Copy"}
              </button>
            </div>
            <pre
              className={`overflow-x-auto px-4 py-4 text-[13px] leading-relaxed ${
                isEmail ? "font-sans" : "font-mono"
              } text-zaki-primary dark:text-zaki-dark-primary whitespace-pre`}
            >
              <code className={codeClassName}>
                {shouldUseChildren ? children : text}
              </code>
            </pre>
          </div>
        );
      },
      table: ({ children }: { children: React.ReactNode }) => {
        const rows = extractTableRows(children);
        const tsv = rows.map((row) => row.join("\t")).join("\n");
        const key = `table:${tsv.slice(0, 32)}`;
        const handleCopy = async () => {
          try {
            await navigator.clipboard.writeText(tsv);
            setCopiedBlock(key);
            window.setTimeout(() => setCopiedBlock(null), 1200);
          } catch {
            setCopiedBlock(null);
          }
        };
        return (
          <div className="mb-4 overflow-x-auto">
            <div className="flex items-center justify-end mb-2">
              <button
                type="button"
                className="text-2xs font-semibold text-zaki-muted dark:text-zaki-dark-muted hover:text-zaki-primary dark:hover:text-zaki-dark-primary transition-colors"
                onClick={handleCopy}
              >
                {copiedBlock === key ? "Copied" : "Copy table"}
              </button>
            </div>
            <table className="w-full text-left text-sm text-zaki-primary dark:text-zaki-dark-primary">
              {children}
            </table>
          </div>
        );
      },
      thead: ({ children }: { children: React.ReactNode }) => (
        <thead className="text-[11px] uppercase tracking-[0.2em] text-zaki-muted dark:text-zaki-dark-muted">
          {children}
        </thead>
      ),
      tbody: ({ children }: { children: React.ReactNode }) => (
        <tbody className="bg-transparent">{children}</tbody>
      ),
      tr: ({ children }: { children: React.ReactNode }) => (
        <tr className="border-b border-zaki-subtle dark:border-zaki-dark last:border-b-0">
          {children}
        </tr>
      ),
      th: ({ children }: { children: React.ReactNode }) => (
        <th className="px-4 py-3 text-[11px] font-semibold whitespace-nowrap">{children}</th>
      ),
      td: ({ children }: { children: React.ReactNode }) => (
        <td className="px-4 py-3 text-[13px] leading-6">{children}</td>
      ),
    }),
    [copiedBlock]
  );

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      components={components as any}
    >
      {content}
    </ReactMarkdown>
  );
}
