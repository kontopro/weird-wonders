import { Bold, Italic, Link2 } from "lucide-react";
import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";

/**
 * Textarea with a small formatting toolbar. It writes the inline syntax from
 * `src/lib/inline-markup.ts` (**bold**, *italic*, [text](url)) — readable as
 * plain text, and rendered safely on the site.
 */
export function RichTextArea({
  value,
  onChange,
  rows = 5,
  placeholder,
  onPasteParagraphs,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  /** When set, pasting several paragraphs keeps the first here and passes on the rest. */
  onPasteParagraphs?: (paragraphs: string[]) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const replaceSelection = (
    build: (selected: string) => { text: string; select: [number, number] },
  ) => {
    const element = ref.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const { text, select } = build(value.slice(start, end));
    onChange(value.slice(0, start) + text + value.slice(end));
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + select[0], start + select[1]);
    });
  };

  const wrap = (marker: string, fallback: string) =>
    replaceSelection((selected) => {
      const inner = selected || fallback;
      return {
        text: `${marker}${inner}${marker}`,
        select: [marker.length, marker.length + inner.length],
      };
    });

  const link = () =>
    replaceSelection((selected) => {
      const label = selected || "κείμενο συνδέσμου";
      const url = "https://";
      const text = `[${label}](${url})`;
      // Select the URL so it can be typed or pasted over right away.
      return { text, select: [label.length + 3, label.length + 3 + url.length] };
    });

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      wrap("**", "έντονο κείμενο");
    } else if (key === "i") {
      event.preventDefault();
      wrap("*", "πλάγιο κείμενο");
    } else if (key === "k") {
      event.preventDefault();
      link();
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!onPasteParagraphs) return;
    const pasted = event.clipboardData.getData("text/plain");
    const paragraphs = pasted
      .split(/\r?\n\s*\r?\n/)
      .map((paragraph) => paragraph.replace(/\s*\r?\n\s*/g, " ").trim())
      .filter(Boolean);
    if (paragraphs.length < 2) return;
    event.preventDefault();
    const [first, ...rest] = paragraphs;
    replaceSelection(() => ({ text: first!, select: [first!.length, first!.length] }));
    onPasteParagraphs(rest);
  };

  return (
    <div className="rich-text-area">
      <div className="rich-text-toolbar" role="toolbar" aria-label="Μορφοποίηση κειμένου">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => wrap("**", "έντονο κείμενο")}
          aria-label="Έντονα (Ctrl+B)"
          title="Έντονα (Ctrl+B)"
        >
          <Bold />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => wrap("*", "πλάγιο κείμενο")}
          aria-label="Πλάγια (Ctrl+I)"
          title="Πλάγια (Ctrl+I)"
        >
          <Italic />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={link}
          aria-label="Σύνδεσμος (Ctrl+K)"
          title="Σύνδεσμος (Ctrl+K)"
        >
          <Link2 />
        </Button>
        <small>**έντονα** · *πλάγια* · [κείμενο](https://…)</small>
      </div>
      <textarea
        ref={ref}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
      />
    </div>
  );
}
