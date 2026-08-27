import assert from "node:assert/strict";
import test from "node:test";

import { assertGroundedText } from "@/lib/ai/grounding";
import {
  deterministicLetter,
  regenerateDeterministicParagraph,
} from "@/lib/job-intelligence/cover-letter-compose";

const evidence = [
  { id: "one", label: "Example role", text: "Built a reliable API used by the support workflow." },
  { id: "two", label: "Example project", text: "Documented edge cases and added integration tests." },
  { id: "three", label: "Second project", text: "Improved a database query after measuring its execution plan." },
];

test("deterministic cover letters honor word limits and preserve evidence IDs", () => {
  const letter = deterministicLetter({
    company: "Example Company",
    role: "Backend Engineer",
    name: "Candidate Name",
    evidence,
    maxWords: 150,
    tone: "direct",
  });
  assert.ok(letter.content.split(/\s+/).length <= 150);
  assert.deepEqual(letter.paragraphs.flatMap((paragraph) => paragraph.evidenceIds), ["one"]);
  assert.match(letter.content, /Built a reliable API/);
});

test("paragraph regeneration only uses evidence cited by the source paragraph", () => {
  const paragraph = regenerateDeterministicParagraph({
    paragraph: { text: "old", evidenceIds: ["two"] },
    evidence,
    company: "Example Company",
    role: "Backend Engineer",
    versionNumber: 2,
  });
  assert.deepEqual(paragraph.evidenceIds, ["two"]);
  assert.match(paragraph.text, /Documented edge cases/);
  assert.doesNotMatch(paragraph.text, /reliable API/);
});

test("all deterministic tones stay grounded in the supplied company, role, and evidence", () => {
  for (const tone of ["direct", "warm", "technical", "startup", "formal", "enthusiastic"] as const) {
    const letter = deterministicLetter({
      company: "Example Company",
      role: "Backend Engineer",
      name: "Candidate Name",
      evidence,
      maxWords: 300,
      tone,
    });
    for (const paragraph of letter.paragraphs) {
      const cited = evidence.filter((item) => paragraph.evidenceIds.includes(item.id));
      assert.doesNotThrow(() => assertGroundedText({
        text: paragraph.text,
        sources: [
          "Example Company",
          "Backend Engineer",
          "Candidate Name",
          ...cited.flatMap((item) => [item.label, item.text]),
        ],
      }));
    }
  }
});
