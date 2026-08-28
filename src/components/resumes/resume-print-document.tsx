import type { CSSProperties } from "react";

import type { ResumeRenderEntry, ResumeRenderModel, ResumeRenderSection } from "@/lib/resumes/render-model";
import { cn } from "@/lib/utils";

export function ResumePrintDocument({ model }: { model: ResumeRenderModel }) {
  const p = model.presentation;
  const paperStyle: CSSProperties = {
    minHeight: p.paperSize === "a4" ? "11.69in" : "11in",
    width: p.paperSize === "a4" ? "8.27in" : "8.5in",
    maxWidth: "100%",
    padding: `${p.marginsPt.top}pt ${p.marginsPt.right}pt ${p.marginsPt.bottom}pt ${p.marginsPt.left}pt`,
    fontFamily: model.template.fontFamily === "serif" ? 'Georgia, "Times New Roman", serif' : 'Arial, Helvetica, sans-serif',
    fontSize: `${10 * p.fontScale}pt`,
    lineHeight: p.lineHeight,
  };
  const sidebarTypes = new Set(["skills", "certifications", "languages"]);
  const sidebar = model.sections.filter((section) => sidebarTypes.has(section.type));
  const main = model.sections.filter((section) => !sidebarTypes.has(section.type));

  return (
    <article className="resume-print-document mx-auto bg-white text-neutral-900 shadow-xl print:shadow-none" style={paperStyle} aria-label="Resume document">
      <header className="text-center">
        <h1 className="text-[2em] font-bold tracking-tight">{model.name}</h1>
        {model.headline ? <p className="mt-1 font-medium">{model.headline}</p> : null}
        <p className="mt-1 text-[0.9em]">
          {model.contactText.map((value, index) => <span key={`${value}-${index}`}>{index ? " · " : ""}{value}</span>)}
          {model.links.map((link) => <span key={link.url}> · <a href={link.url}>{link.label}</a></span>)}
        </p>
      </header>
      {model.template.columns === 2 ? (
        <div className="mt-4 grid grid-cols-[0.31fr_0.69fr] gap-5">
          <div>{sidebar.map((section) => <PrintSection key={section.id} section={section} model={model} />)}</div>
          <div>{main.map((section) => <PrintSection key={section.id} section={section} model={model} />)}</div>
        </div>
      ) : <div className="mt-4">{model.sections.map((section) => <PrintSection key={section.id} section={section} model={model} />)}</div>}
    </article>
  );
}

function PrintSection({ section, model }: { section: ResumeRenderSection; model: ResumeRenderModel }) {
  return (
    <section style={{ marginTop: model.presentation.sectionGapPt, breakBefore: section.pageBreakBefore ? "page" : "auto" }}>
      <h2 className={cn("mb-1 pb-0.5 text-[1.05em] font-bold uppercase tracking-[0.08em]", model.template.accent !== "none" && "border-b border-neutral-700")}>{section.title}</h2>
      {section.inlineText ? <p>{section.inlineText}</p> : null}
      <div className="grid gap-2">{section.entries.map((entry) => <PrintEntry key={entry.id} entry={entry} bulletGap={model.presentation.bulletGapPt} />)}</div>
    </section>
  );
}

function PrintEntry({ entry, bulletGap }: { entry: ResumeRenderEntry; bulletGap: number }) {
  return (
    <div className="break-inside-avoid">
      <div className="flex justify-between gap-4 font-bold"><span>{entry.primary}</span><span className="shrink-0 text-right">{entry.date}</span></div>
      {entry.secondary || entry.location ? <div className="flex justify-between gap-4 italic"><span>{entry.secondary}</span><span className="shrink-0 text-right">{entry.location}</span></div> : null}
      {entry.body ? <p>{entry.body}</p> : null}
      {entry.bullets.length ? <ul className="ml-4 list-disc">{entry.bullets.map((bullet, index) => <li key={`${entry.id}-${index}`} style={{ marginTop: bulletGap }}>{bullet}</li>)}</ul> : null}
    </div>
  );
}
