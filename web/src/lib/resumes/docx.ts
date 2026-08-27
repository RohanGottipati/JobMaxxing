import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

import type { ResumeRenderEntry, ResumeRenderModel, ResumeRenderSection } from "@/lib/resumes/render-model";

const TWIPS_PER_POINT = 20;

export async function generateResumeDocx(model: ResumeRenderModel): Promise<Buffer> {
  const p = model.presentation;
  const font = model.template.fontFamily === "serif" ? "Times New Roman" : "Arial";
  const size = Math.round(20 * p.fontScale);
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: model.name, bold: true, size: Math.round(size * 2), font })],
    }),
  ];

  if (model.headline) {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: model.headline, bold: true, size, font })] }));
  }

  const contactRuns: Array<TextRun | ExternalHyperlink> = [];
  model.contactText.forEach((value, index) => {
    contactRuns.push(new TextRun({ text: `${index ? " · " : ""}${value}`, size: Math.round(size * 0.9), font }));
  });
  model.links.forEach((link) => {
    contactRuns.push(new ExternalHyperlink({ link: link.url, children: [new TextRun({ text: ` · ${link.label}`, style: "Hyperlink", size: Math.round(size * 0.9), font })] }));
  });
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: p.sectionGapPt * TWIPS_PER_POINT }, children: contactRuns }));

  for (const section of model.sections) children.push(...docxSection(section, model));

  const document = new Document({
    creator: "JobMaxxing",
    title: `${model.name} Resume`,
    styles: {
      default: { document: { run: { font, size }, paragraph: { spacing: { line: Math.round(240 * p.lineHeight) } } } },
      paragraphStyles: [{
        id: "ResumeSection",
        name: "Resume Section",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { bold: true, size: Math.round(size * 1.08), font, allCaps: true },
        paragraph: {
          spacing: { before: p.sectionGapPt * TWIPS_PER_POINT, after: 50 },
          border: model.template.accent === "none" ? undefined : { bottom: { color: "404040", style: BorderStyle.SINGLE, size: 4, space: 1 } },
        },
      }],
    },
    sections: [{
      properties: {
        page: {
          size: p.paperSize === "a4" ? { width: 11906, height: 16838 } : { width: 12240, height: 15840 },
          margin: {
            top: p.marginsPt.top * TWIPS_PER_POINT,
            right: p.marginsPt.right * TWIPS_PER_POINT,
            bottom: p.marginsPt.bottom * TWIPS_PER_POINT,
            left: p.marginsPt.left * TWIPS_PER_POINT,
          },
        },
      },
      children,
    }],
  });
  return Packer.toBuffer(document);
}

function docxSection(section: ResumeRenderSection, model: ResumeRenderModel): Paragraph[] {
  const font = model.template.fontFamily === "serif" ? "Times New Roman" : "Arial";
  const size = Math.round(20 * model.presentation.fontScale);
  const paragraphs = [new Paragraph({
    style: "ResumeSection",
    heading: HeadingLevel.HEADING_2,
    pageBreakBefore: section.pageBreakBefore,
    children: [new TextRun({ text: section.title, bold: true, font, size: Math.round(size * 1.08) })],
  })];
  if (section.inlineText) paragraphs.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: section.inlineText, font, size })] }));
  for (const entry of section.entries) paragraphs.push(...docxEntry(entry, model));
  return paragraphs;
}

function docxEntry(entry: ResumeRenderEntry, model: ResumeRenderModel): Paragraph[] {
  const font = model.template.fontFamily === "serif" ? "Times New Roman" : "Arial";
  const size = Math.round(20 * model.presentation.fontScale);
  const paragraphs = [new Paragraph({
    keepNext: true,
    spacing: { after: 10 },
    children: [
      new TextRun({ text: entry.primary, bold: true, font, size }),
      ...(entry.date ? [new TextRun({ text: `  |  ${entry.date}`, bold: true, font, size })] : []),
    ],
  })];
  if (entry.secondary || entry.location) paragraphs.push(new Paragraph({ keepNext: true, spacing: { after: 20 }, children: [new TextRun({ text: [entry.secondary, entry.location].filter(Boolean).join("  |  "), italics: true, font, size })] }));
  if (entry.body) paragraphs.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: entry.body, font, size })] }));
  for (const bullet of entry.bullets) paragraphs.push(new Paragraph({ bullet: { level: 0 }, spacing: { before: model.presentation.bulletGapPt * TWIPS_PER_POINT, after: 0 }, children: [new TextRun({ text: bullet, font, size })] }));
  return paragraphs;
}
