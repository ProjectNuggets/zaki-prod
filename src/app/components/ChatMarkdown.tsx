import { useMemo, useState, isValidElement } from "react";
import { useTranslation } from "react-i18next";
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

function looksLikeEmail(content: string) {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 3) return false;

  const headerCount = lines.filter((line) =>
    /^(to|from|subject|cc|bcc):/i.test(line)
  ).length;
  if (headerCount >= 1) return true;

  const hasGreeting = lines.some((line) =>
    /^(hi|hello|dear)\b/i.test(line)
  );
  const hasSignoff = lines.some((line) =>
    /^(best|regards|sincerely|thanks|thank you|cheers)\b/i.test(line)
  );
  return hasGreeting && hasSignoff;
}

export function ChatMarkdown({ content }: { content: string }) {
  const { t, i18n } = useTranslation();
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);
  const emailKey = `email:${content.slice(0, 32)}`;
  const showEmailCopy = useMemo(() => looksLikeEmail(content), [content]);
  const markdownContent = useMemo(() => {
    if (!showEmailCopy) return content;
    return content.replace(/\r?\n/g, "  \n");
  }, [content, showEmailCopy]);

  const components = useMemo(
    () => ({
      pre: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      p: ({ children }: { children: React.ReactNode }) => (
        <p className="mb-3 text-[15px] leading-7 text-zaki-primary dark:text-zaki-dark-primary last:mb-0 rtl:text-right">
          {children}
        </p>
      ),
      h1: ({ children }: { children: React.ReactNode }) => (
        <h1 className="mb-3 text-xl font-semibold text-zaki-primary dark:text-zaki-dark-primary rtl:text-right">
          {children}
        </h1>
      ),
      h2: ({ children }: { children: React.ReactNode }) => (
        <h2 className="mb-3 text-[17px] font-semibold text-zaki-primary dark:text-zaki-dark-primary rtl:text-right">
          {children}
        </h2>
      ),
      h3: ({ children }: { children: React.ReactNode }) => (
        <h3 className="mb-2 text-[15px] font-semibold text-zaki-primary dark:text-zaki-dark-primary rtl:text-right">
          {children}
        </h3>
      ),
      ul: ({ children }: { children: React.ReactNode }) => (
        <ul className="mb-3 list-disc space-y-1 pl-5 text-[15px] leading-7 text-zaki-primary dark:text-zaki-dark-primary rtl:text-right rtl:pl-0 rtl:pr-5">
          {children}
        </ul>
      ),
      ol: ({ children }: { children: React.ReactNode }) => (
        <ol className="mb-3 list-decimal space-y-1 pl-5 text-[15px] leading-7 text-zaki-primary dark:text-zaki-dark-primary rtl:text-right rtl:pl-0 rtl:pr-5">
          {children}
        </ol>
      ),
      li: ({ children }: { children: React.ReactNode }) => (
        <li className="leading-7 rtl:text-right">{children}</li>
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
          className="text-zaki-brand underline underline-offset-2 hover:text-zaki-brand rtl:text-right"
        >
          {children}
        </a>
      ),
      blockquote: ({ children }: { children: React.ReactNode }) => (
        <blockquote className="mb-3 border-l-2 border-zaki-strong pl-3 text-[15px] leading-7 text-zaki-secondary dark:text-zaki-dark-subtle rtl:text-right rtl:border-l-0 rtl:border-r-2 rtl:pl-0 rtl:pr-3">
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
            <code
              dir="auto"
              className="rounded-md bg-[#f6f4f1] dark:bg-[#1f1a15] px-1.5 py-0.5 font-mono text-[0.85em] text-[#8b4a3a] dark:text-[#d3b59a] rtl:text-right"
            >
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
          <div className="zaki-codeblock my-4 overflow-hidden rounded-xl border border-zaki-subtle dark:border-zaki-dark bg-transparent">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zaki-subtle dark:border-zaki-dark bg-transparent">
              <span className="text-2xs font-semibold tracking-[0.2em] text-zaki-muted dark:text-zaki-dark-muted whitespace-nowrap">
                {displayLanguage}
              </span>
              <button
                type="button"
                className="text-2xs font-semibold text-zaki-muted dark:text-zaki-dark-muted hover:text-zaki-primary dark:hover:text-zaki-dark-primary transition-colors"
                onClick={handleCopy}
                aria-label={isEmail ? t("chat.copyEmail") : t("chat.copyCode")}
              >
                {copiedBlock === key
                  ? t("chat.copied")
                  : isEmail
                  ? t("chat.copyEmail")
                  : t("chat.copyCode")}
              </button>
            </div>
            <pre
              dir={isEmail ? "auto" : "ltr"}
              className={`overflow-x-auto px-4 py-4 text-[13px] leading-relaxed ${
                isEmail
                  ? "whitespace-pre-wrap break-words font-sans"
                  : "whitespace-pre font-mono"
              } text-zaki-primary dark:text-zaki-dark-primary`}
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
            <div className="flex items-center justify-end mb-2 rtl:justify-end">
              <button
                type="button"
                className="text-2xs font-semibold text-zaki-muted dark:text-zaki-dark-muted hover:text-zaki-primary dark:hover:text-zaki-dark-primary transition-colors"
                onClick={handleCopy}
                aria-label={t("chat.copyTable")}
              >
                {copiedBlock === key ? t("chat.copied") : t("chat.copyTable")}
              </button>
            </div>
            <table className="w-full text-left text-sm text-zaki-primary dark:text-zaki-dark-primary rtl:text-right border-separate border-spacing-0">
              {children}
            </table>
          </div>
        );
      },
      thead: ({ children }: { children: React.ReactNode }) => (
        <thead className="text-[11px] uppercase tracking-[0.2em] text-zaki-muted dark:text-zaki-dark-muted sticky top-0 z-10 bg-zaki-base/90 dark:bg-[#0f0b08]/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(0,0,0,0.3)]">
          {children}
        </thead>
      ),
      tbody: ({ children }: { children: React.ReactNode }) => (
        <tbody className="bg-transparent">{children}</tbody>
      ),
      tr: ({ children }: { children: React.ReactNode }) => (
        <tr className="border-b border-zaki-subtle dark:border-zaki-dark last:border-b-0 even:bg-[rgba(240,225,209,0.35)] dark:even:bg-[rgba(255,255,255,0.03)] hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover transition-colors">
          {children}
        </tr>
      ),
      th: ({ children }: { children: React.ReactNode }) => (
        <th className="px-4 py-3 text-[11px] font-semibold whitespace-nowrap text-left rtl:text-right">
          {children}
        </th>
      ),
      td: ({ children }: { children: React.ReactNode }) => {
        const cellText = extractText(children).trim();
        const isNumeric =
          cellText.length > 0 &&
          /^[\d\s.,%+\-()$€£¥₺₹]+$/.test(cellText);
        return (
          <td
            className={`px-4 py-3 text-[13px] leading-6 break-normal ${
              isNumeric ? "text-right rtl:text-right tabular-nums" : "text-left rtl:text-right"
            }`}
          >
            {children}
          </td>
        );
      },
    }),
    [copiedBlock, t, i18n.language]
  );

  return (
    <>
      {showEmailCopy && (
        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-zaki-muted dark:text-zaki-dark-muted rtl:justify-end rtl:gap-2">
          <span className="text-zaki-muted dark:text-zaki-dark-muted rtl:text-right">
            {t("chat.emailLabel")}
          </span>
          <button
            type="button"
            className="text-2xs font-semibold text-zaki-muted dark:text-zaki-dark-muted hover:text-zaki-primary dark:hover:text-zaki-dark-primary transition-colors"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(content);
                setCopiedBlock(emailKey);
                window.setTimeout(() => setCopiedBlock(null), 1200);
              } catch {
                setCopiedBlock(null);
              }
            }}
            aria-label={t("chat.copyEmail")}
          >
            {copiedBlock === emailKey ? t("chat.copied") : t("chat.copyEmail")}
          </button>
        </div>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        components={components as any}
      >
        {markdownContent}
      </ReactMarkdown>
    </>
  );
}
