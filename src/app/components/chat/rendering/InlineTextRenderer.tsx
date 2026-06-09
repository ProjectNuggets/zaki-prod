import { Fragment } from "react";
import { cn } from "@/lib/utils";
import type { InlineNode } from "./types";

export function InlineTextRenderer({
  nodes,
  prose = false,
}: {
  nodes: InlineNode[];
  prose?: boolean;
}) {
  return (
    <>
      {nodes.map((node, index) => {
        const key = `${node.type}-${index}`;
        switch (node.type) {
          case "text":
            return <Fragment key={key}>{node.text}</Fragment>;
          case "strong":
            return (
              <strong key={key} className="font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                <InlineTextRenderer nodes={node.children} prose={prose} />
              </strong>
            );
          case "emphasis":
            return (
              <em key={key} className="italic text-zaki-secondary dark:text-zaki-dark-subtle">
                <InlineTextRenderer nodes={node.children} prose={prose} />
              </em>
            );
          case "inline_code":
            return (
              <code
                key={key}
                dir="ltr"
                className={cn(
                  "rounded-[8px] border border-zaki-subtle/80 bg-zaki-sunken px-1.5 py-0.5 font-mono text-[0.84em] text-zaki-primary dark:border-zaki-dark",
                  prose && "whitespace-pre-wrap",
                )}
              >
                {node.text}
              </code>
            );
          case "link":
            return (
              <a
                key={key}
                href={node.href}
                target="_blank"
                rel="noreferrer"
                className="text-zaki-brand underline underline-offset-2 hover:text-zaki-brand"
              >
                <InlineTextRenderer nodes={node.children} prose={prose} />
              </a>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
