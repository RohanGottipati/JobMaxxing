import type { JobStructuredData } from "@/lib/job-intelligence/schemas";

export type JobAnalysisFieldDiff = {
  field: keyof JobStructuredData;
  before: JobStructuredData[keyof JobStructuredData];
  after: JobStructuredData[keyof JobStructuredData];
};

export function diffJobStructuredData(
  before: JobStructuredData,
  after: JobStructuredData,
): JobAnalysisFieldDiff[] {
  return (Object.keys(before) as Array<keyof JobStructuredData>).flatMap((field) =>
    JSON.stringify(before[field]) === JSON.stringify(after[field])
      ? []
      : [{ field, before: before[field], after: after[field] }],
  );
}
