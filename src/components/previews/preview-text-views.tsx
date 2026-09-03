"use client";

import { Fragment } from "react";

import { PreviewEmpty } from "@/components/previews/preview-states";
import {
  parseMarkdownBlocks,
  type MarkdownSpan,
} from "@/lib/previews/markdown";
import { LATEX_ENGINE_LABELS } from "@/lib/latex/constants";
import type { LatexEngine } from "@/types/database";

const PAPER_CLASSES =
  "mx-auto w-full max-w-[8.5in] bg-white p-[0.9in] text-neutral-900 shadow-lg";

const SCROLLER_CLASSES =
  "max-h-[min(70dvh,44rem)] overflow-auto overscroll-contain rounded-lg border border-border bg-neutral-200 p-3 dark:bg-neutral-800";

function Spans({ spans }: { spans: MarkdownSpan[] }) {
  return (
    <>
      {spans.map((span, index) => (
        <Fragment key={index}>
          {span.type === "strong" ? <strong>{span.text}</strong> : null}
          {span.type === "emphasis" ? <em>{span.text}</em> : null}
          {span.type === "code" ? (
            <code className="rounded bg-neutral-200 px-1 py-0.5 font-mono text-[0.9em]">
              {span.text}
            </code>
          ) : null}
          {span.type === "link" ? (
            <a
              href={span.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="underline"
            >
              {span.text}
            </a>
          ) : null}
          {span.type === "text" ? span.text : null}
        </Fragment>
      ))}
    </>
  );
}

export function PreviewMarkdownView({ text }: { text: string }) {
  const blocks = parseMarkdownBlocks(text);
  if (!blocks.length) return <PreviewEmpty title="This document is empty" />;

  return (
    <div className={SCROLLER_CLASSES}>
      <article className={PAPER_CLASSES}>
        {blocks.map((block, index) => {
          if (block.type === "rule") {
            return <hr key={index} className="my-4 border-neutral-300" />;
          }
          if (block.type === "code") {
            return (
              <pre
                key={index}
                className="my-3 overflow-x-auto rounded bg-neutral-100 p-3 font-mono text-xs leading-5"
              >
                {block.text}
              </pre>
            );
          }
          if (block.type === "quote") {
            return (
              <blockquote
                key={index}
                className="my-3 border-l-2 border-neutral-400 pl-3 italic"
              >
                <Spans spans={block.spans} />
              </blockquote>
            );
          }
          if (block.type === "list") {
            const ListTag = block.ordered ? "ol" : "ul";
            return (
              <ListTag
                key={index}
                className={`my-3 ml-5 ${block.ordered ? "list-decimal" : "list-disc"}`}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="mt-1">
                    <Spans spans={item} />
                  </li>
                ))}
              </ListTag>
            );
          }
          if (block.type === "heading") {
            const sizes = {
              1: "text-2xl",
              2: "text-xl",
              3: "text-lg",
              4: "text-base",
              5: "text-sm",
              6: "text-sm",
            } as const;
            const HeadingTag = `h${block.level}` as const;
            return (
              <HeadingTag
                key={index}
                className={`mt-4 mb-2 font-bold ${sizes[block.level]}`}
              >
                <Spans spans={block.spans} />
              </HeadingTag>
            );
          }
          return (
            <p key={index} className="my-2 leading-relaxed">
              <Spans spans={block.spans} />
            </p>
          );
        })}
      </article>
    </div>
  );
}

export function PreviewPlainTextView({
  text,
  layout,
}: {
  text: string;
  layout: "page" | "monospace";
}) {
  if (!text.trim()) return <PreviewEmpty title="This document is empty" />;

  if (layout === "monospace") {
    return (
      <pre className="max-h-[min(70dvh,44rem)] overflow-auto overscroll-contain rounded-lg border border-border bg-parchment/40 p-4 font-mono text-xs leading-5 whitespace-pre-wrap">
        {text}
      </pre>
    );
  }

  return (
    <div className={SCROLLER_CLASSES}>
      <article className={`${PAPER_CLASSES} leading-relaxed whitespace-pre-wrap`}>
        {text}
      </article>
    </div>
  );
}

export function PreviewLatexSourceView({
  source,
  engine,
}: {
  source: string;
  engine: LatexEngine;
}) {
  if (!source.trim()) return <PreviewEmpty title="This document has no source yet" />;

  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted-foreground">
        LaTeX source · compiles with {LATEX_ENGINE_LABELS[engine]}
      </p>
      <pre className="max-h-[min(70dvh,44rem)] overflow-auto overscroll-contain rounded-lg border border-border bg-parchment/40 p-4 font-mono text-xs leading-5">
        {source}
      </pre>
    </div>
  );
}
