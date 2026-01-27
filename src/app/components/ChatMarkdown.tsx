import { useMemo, useState, isValidElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";

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
    return extractText(node.props?.children);
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

export function ChatMarkdown({ content }: { content: string }) {
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  const components = useMemo(
    () => ({
      pre: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      p: ({ children }: { children: React.ReactNode }) => (
        <p className="mb-3 text-sm leading-6 text-[#1f1a14] last:mb-0">
          {children}
        </p>
      ),
      h1: ({ children }: { children: React.ReactNode }) => (
        <h1 className="mb-3 text-lg font-semibold text-[#1f1a14]">
          {children}
        </h1>
      ),
      h2: ({ children }: { children: React.ReactNode }) => (
        <h2 className="mb-3 text-base font-semibold text-[#1f1a14]">
          {children}
        </h2>
      ),
      h3: ({ children }: { children: React.ReactNode }) => (
        <h3 className="mb-2 text-sm font-semibold text-[#1f1a14]">
          {children}
        </h3>
      ),
      ul: ({ children }: { children: React.ReactNode }) => (
        <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-[#1f1a14]">
          {children}
        </ul>
      ),
      ol: ({ children }: { children: React.ReactNode }) => (
        <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-[#1f1a14]">
          {children}
        </ol>
      ),
      li: ({ children }: { children: React.ReactNode }) => (
        <li className="leading-6">{children}</li>
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
          className="text-[#D24430] underline underline-offset-2 hover:text-[#b63a28]"
        >
          {children}
        </a>
      ),
      blockquote: ({ children }: { children: React.ReactNode }) => (
        <blockquote className="mb-3 border-l-2 border-[#e7dbc9] pl-3 text-sm text-[#655543]">
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
            <code className="rounded bg-[#f6efe6] px-1.5 py-0.5 font-mono text-[0.85em] text-[#5c4a35]">
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
        const key = `${rawLanguage || "code"}:${text.slice(0, 32)}`;
        const codeClassName =
          typeof className === "string"
            ? className
            : Array.isArray(className)
            ? className.join(" ")
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
          <div className="my-4 overflow-hidden rounded-2xl border border-[#e9dfd2] bg-[#fdfaf6]">
            <div className="flex items-center justify-between bg-[#f6efe6] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[#88735A]">
              <span>{displayLanguage}</span>
              <button
                type="button"
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#88735A] hover:text-[#655543]"
                onClick={handleCopy}
              >
                {copiedBlock === key ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="overflow-x-auto px-4 py-3 text-sm leading-6 text-[#1f1a14] font-mono">
              <code className={codeClassName}>
                {shouldUseChildren ? children : text}
              </code>
            </pre>
          </div>
        );
      },
      table: ({ children }: { children: React.ReactNode }) => (
        <div className="mb-4 overflow-hidden rounded-2xl border border-[#e9dfd2]">
          <table className="w-full text-left text-sm text-[#1f1a14]">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }: { children: React.ReactNode }) => (
        <thead className="bg-[#f6efe6] text-xs uppercase tracking-[0.14em] text-[#88735A]">
          {children}
        </thead>
      ),
      tbody: ({ children }: { children: React.ReactNode }) => (
        <tbody className="bg-white">{children}</tbody>
      ),
      tr: ({ children }: { children: React.ReactNode }) => (
        <tr className="border-b border-[#efe4d6] last:border-b-0">
          {children}
        </tr>
      ),
      th: ({ children }: { children: React.ReactNode }) => (
        <th className="px-3 py-2 text-xs font-semibold">{children}</th>
      ),
      td: ({ children }: { children: React.ReactNode }) => (
        <td className="px-3 py-2">{children}</td>
      ),
    }),
    [copiedBlock]
  );

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}
