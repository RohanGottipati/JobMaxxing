export type SourcedText = { value: string; sourceText: string };

function normalized(value: string) {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

export function isGroundedAiField(source: string, field: SourcedText | null | undefined) {
  if (!field) return false;
  const corpus = normalized(source);
  const evidence = normalized(field.sourceText);
  const value = normalized(field.value);
  return evidence.length >= 2 && value.length >= 1 && corpus.includes(evidence) && corpus.includes(value);
}
