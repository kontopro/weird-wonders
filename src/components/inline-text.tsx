import type { ReactNode } from "react";
import { parseInline, type InlineNode } from "@/lib/inline-markup";

const isExternal = (href: string) => /^https?:\/\//.test(href);

function renderNodes(nodes: InlineNode[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (node.type) {
      case "text":
        return node.text;
      case "bold":
        return <strong key={key}>{renderNodes(node.children, key)}</strong>;
      case "italic":
        return <em key={key}>{renderNodes(node.children, key)}</em>;
      case "link":
        return (
          <a
            key={key}
            href={node.href}
            {...(isExternal(node.href) ? { rel: "noopener noreferrer" } : {})}
          >
            {renderNodes(node.children, key)}
          </a>
        );
    }
  });
}

/** Renders article text with **bold**, *italic* and [links](https://…); never raw HTML. */
export function InlineText({ text }: { text: string }) {
  return <>{renderNodes(parseInline(text), "inline")}</>;
}
