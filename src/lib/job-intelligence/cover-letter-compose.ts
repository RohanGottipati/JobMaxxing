export type CoverLetterTone =
  | "direct"
  | "warm"
  | "technical"
  | "startup"
  | "formal"
  | "enthusiastic";

export type CoverLetterEvidence = { id: string; label: string; text: string };
export type CoverLetterParagraph = { text: string; evidenceIds: string[] };

const openings: Record<CoverLetterTone, (role: string, company: string) => string> = {
  direct: (role, company) => `I am applying for the ${role} role at ${company}.`,
  warm: (role, company) => `Thank you for considering my application for the ${role} role at ${company}.`,
  technical: (role, company) => `I am applying for the ${role} role at ${company} with directly relevant, verified experience.`,
  startup: (role, company) => `I am applying for the ${role} role at ${company} with evidence I can discuss in practical detail.`,
  formal: (role, company) => `Please accept my application for the ${role} role at ${company}.`,
  enthusiastic: (role, company) => `I am excited to apply for the ${role} role at ${company}.`,
};

export function deterministicLetter(input: {
  company: string;
  role: string;
  name: string;
  evidence: CoverLetterEvidence[];
  maxWords: 150 | 200 | 300;
  tone: CoverLetterTone;
}) {
  const evidenceLimit = input.maxWords >= 300 ? 3 : input.maxWords >= 200 ? 2 : 1;
  const selectedEvidence = input.evidence.slice(0, evidenceLimit);
  const paragraphs: CoverLetterParagraph[] = [];
  const first = selectedEvidence[0];
  paragraphs.push({
    text: [
      openings[input.tone](input.role, input.company),
      first ? `A relevant verified example from ${first.label} is: ${first.text}` : "",
    ].filter(Boolean).join(" "),
    evidenceIds: first ? [first.id] : [],
  });
  for (const item of selectedEvidence.slice(1)) {
    paragraphs.push({
      text: `Another verified example from ${item.label} is: ${item.text}`,
      evidenceIds: [item.id],
    });
  }
  paragraphs.push({
    text: `I would welcome the opportunity to discuss how this evidence can support the ${input.role} team. Thank you for your consideration.`,
    evidenceIds: [],
  });
  return fitLetterToLimit(paragraphs, input.name, input.maxWords);
}

export function regenerateDeterministicParagraph(input: {
  paragraph: CoverLetterParagraph;
  evidence: CoverLetterEvidence[];
  company: string;
  role: string;
  versionNumber: number;
}) {
  const cited = input.evidence.filter((item) => input.paragraph.evidenceIds.includes(item.id));
  if (!cited.length) {
    return {
      text: input.versionNumber % 2
        ? `Thank you for considering my application for the ${input.role} role at ${input.company}. I would welcome a conversation about the verified evidence in this letter.`
        : `I would welcome the opportunity to discuss the verified evidence supporting my application for the ${input.role} role at ${input.company}.`,
      evidenceIds: [],
    };
  }
  return {
    text: cited
      .map((item, index) => `${index ? "A further" : "One"} verified example from ${item.label} is: ${item.text}`)
      .join(" "),
    evidenceIds: cited.map((item) => item.id),
  };
}

export function fitLetterToLimit(
  sourceParagraphs: CoverLetterParagraph[],
  name: string,
  maxWords: 150 | 200 | 300,
) {
  const paragraphs = sourceParagraphs.map((paragraph) => ({ ...paragraph }));
  const compose = () => `Dear Hiring Team,\n\n${paragraphs.map((item) => item.text).join("\n\n")}\n\nSincerely,\n${name}`;
  let content = compose();
  let guard = 0;
  while (wordCount(content) > maxWords && guard < 20) {
    guard += 1;
    const overflow = wordCount(content) - maxWords;
    const candidates = paragraphs
      .map((paragraph, index) => ({ index, words: splitWords(paragraph.text).length }))
      .filter((item) => item.words > 16)
      .sort((a, b) => b.words - a.words);
    const longest = candidates[0];
    if (!longest) break;
    const words = splitWords(paragraphs[longest.index].text);
    const keep = Math.max(16, words.length - Math.max(overflow, 1));
    paragraphs[longest.index].text = words.slice(0, keep).join(" ").replace(/[,:;]+$/, "") + ".";
    content = compose();
  }
  return { content, paragraphs };
}

function splitWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean);
}

function wordCount(value: string) {
  return splitWords(value).length;
}
