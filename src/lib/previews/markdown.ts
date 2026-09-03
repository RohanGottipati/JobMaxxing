export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; spans: MarkdownSpan[] }
  | { type: "paragraph"; spans: MarkdownSpan[] }
  | { type: "list"; ordered: boolean; items: MarkdownSpan[][] }
  | { type: "quote"; spans: MarkdownSpan[] }
  | { type: "code"; text: string }
  | { type: "rule" };

export type MarkdownSpan =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "emphasis"; text: string }
  | { type: "code"; text: string }
  | { type: "link"; text: string; href: string };

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/;

/**
 * Markdown is parsed into a span tree and rendered as React elements, so raw
 * HTML in a user's document is never interpreted — there is no HTML string to
 * inject into. Only the small subset that appears in resumes and cover letters
 * is supported.
 */
export function parseMarkdownSpans(text: string): MarkdownSpan[] {
  const spans: MarkdownSpan[] = [];
  let rest = text;

  while (rest) {
    const match = INLINE.exec(rest);
    if (!match || match.index === undefined) {
      spans.push({ type: "text", text: rest });
      break;
    }

    if (match.index > 0) {
      spans.push({ type: "text", text: rest.slice(0, match.index) });
    }

    const token = match[0];
    if (token.startsWith("**") || token.startsWith("__")) {
      spans.push({ type: "strong", text: token.slice(2, -2) });
    } else if (token.startsWith("`")) {
      spans.push({ type: "code", text: token.slice(1, -1) });
    } else if (token.startsWith("[")) {
      const divider = token.indexOf("](");
      const label = token.slice(1, divider);
      const href = token.slice(divider + 2, -1);
      spans.push(
        /^(?:https?:\/\/|mailto:)/i.test(href)
          ? { type: "link", text: label, href }
          : { type: "text", text: label },
      );
    } else {
      spans.push({ type: "emphasis", text: token.slice(1, -1) });
    }

    rest = rest.slice(match.index + token.length);
  }

  return spans.filter((span) => span.type !== "text" || span.text.length > 0);
}

export function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ type: "code", text: body.join("\n") });
      continue;
    }

    if (/^(?:---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        spans: parseMarkdownSpans(heading[2].trim()),
      });
      index += 1;
      continue;
    }

    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      const items: MarkdownSpan[][] = [];
      while (index < lines.length) {
        const current = lines[index];
        const nextBullet = ordered
          ? /^\s*\d+[.)]\s+(.*)$/.exec(current)
          : /^\s*[-*+]\s+(.*)$/.exec(current);
        if (!nextBullet) break;
        items.push(parseMarkdownSpans(nextBullet[1].trim()));
        index += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      const body = [quote[1]];
      index += 1;
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        body.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", spans: parseMarkdownSpans(body.join(" ").trim()) });
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(?:#{1,6}\s|>\s?|```|\s*[-*+]\s|\s*\d+[.)]\s|---|\*\*\*|___)/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: "paragraph", spans: parseMarkdownSpans(paragraph.join(" ").trim()) });
  }

  return blocks;
}
