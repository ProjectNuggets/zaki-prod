import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { CodeBlock as CodeBlockType, CopyPromptBlock } from "../types";

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function CodeBlock({ block }: { block: CodeBlockType | CopyPromptBlock }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const isPrompt = block.type === "copy_prompt_block";
  const text = isPrompt ? block.text : block.code;
  const language = isPrompt ? block.label || "COMMAND" : block.language?.toUpperCase() || "CODE";

  const handleCopy = async () => {
    try {
      await copyText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[14px] border border-zaki-subtle/90 bg-[rgba(248,243,236,0.9)] dark:border-zaki-dark dark:bg-[rgba(18,14,11,0.9)]",
        "zaki-codeblock",
        block.provisional && "ring-1 ring-zaki-brand/20",
      )}
    >
      <div className="flex items-center justify-between border-b border-zaki-subtle/80 px-4 py-2 dark:border-zaki-dark">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zaki-muted dark:text-zaki-dark-muted">
          {language}
        </span>
        <button
          type="button"
          className="text-[11px] font-medium text-zaki-muted transition-colors hover:text-zaki-primary dark:text-zaki-dark-muted dark:hover:text-zaki-dark-primary"
          onClick={handleCopy}
          disabled={block.provisional}
        >
          {copied
            ? t("chat.copied", { defaultValue: "Copied" })
            : t("chat.copyCode", { defaultValue: "Copy code" })}
        </button>
      </div>
      <pre
        dir="ltr"
        className={cn(
          "overflow-x-auto px-4 py-4 font-mono text-[13px] leading-[1.6] text-zaki-primary dark:text-zaki-dark-primary",
          isPrompt ? "whitespace-pre-wrap break-words" : "whitespace-pre",
        )}
      >
        <code>{text}</code>
      </pre>
    </div>
  );
}
