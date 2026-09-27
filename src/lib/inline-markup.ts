/**
 * A deliberately small inline syntax for article text — the part of Markdown
 * people and AI tools already write:
 *
 *   **bold**   *italic*   [link text](https://example.com)
 *
 * It is parsed into plain nodes and rendered as React elements, never as
 * HTML, so text cannot inject markup. Links allow http(s), mailto and
 * site-relative paths only. Anything that does not parse stays literal text.
 */

export type InlineNode =
  | { type: "text"; text: string }
  | { type: "bold"; children: InlineNode[] }
  | { type: "italic"; children: InlineNode[] }
  | { type: "link"; href: string; children: InlineNode[] };

export function isSafeHref(value: string) {
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

const pushText = (nodes: InlineNode[], text: string) => {
  if (!text) return;
  const last = nodes.at(-1);
  if (last?.type === "text") last.text += text;
  else nodes.push({ type: "text", text });
};

/** Finds the closing `marker` after `from`, requiring non-empty content. */
function findClose(text: string, marker: string, from: number) {
  const close = text.indexOf(marker, from);
  return close > from ? close : -1;
}

export function parseInline(text: string, depth = 0): InlineNode[] {
  const nodes: InlineNode[] = [];
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);

    if (depth < 4 && rest.startsWith("**")) {
      const close = findClose(text, "**", i + 2);
      if (close !== -1) {
        nodes.push({ type: "bold", children: parseInline(text.slice(i + 2, close), depth + 1) });
        i = close + 2;
        continue;
      }
    }

    if (depth < 4 && rest.startsWith("*") && !rest.startsWith("**") && rest[1] !== " ") {
      const close = findClose(text, "*", i + 1);
      if (close !== -1 && text[close - 1] !== " " && text[close + 1] !== "*") {
        nodes.push({ type: "italic", children: parseInline(text.slice(i + 1, close), depth + 1) });
        i = close + 1;
        continue;
      }
    }

    if (depth < 4 && rest.startsWith("[")) {
      const match = /^\[([^\]\n]+)\]\(([^)\s]+)\)/.exec(rest);
      if (match && isSafeHref(match[2]!)) {
        nodes.push({ type: "link", href: match[2]!, children: parseInline(match[1]!, depth + 1) });
        i += match[0].length;
        continue;
      }
    }

    pushText(nodes, text[i]!);
    i += 1;
  }
  return nodes;
}

/** The visible text without markup (for excerpts, search and reading time). */
export function stripInline(text: string): string {
  const flatten = (nodes: InlineNode[]): string =>
    nodes.map((node) => (node.type === "text" ? node.text : flatten(node.children))).join("");
  return flatten(parseInline(text));
}
