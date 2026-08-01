import type { MaxwellStreamEvent } from "@/lib/maxwell/types";

export function parseMaxwellSseBuffer(buffer: string): {
  events: MaxwellStreamEvent[];
  remainder: string;
} {
  const blocks = buffer.split(/\r?\n\r?\n/);
  const remainder = blocks.pop() ?? "";
  const events = blocks.flatMap((block) => {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    return data ? [JSON.parse(data) as MaxwellStreamEvent] : [];
  });
  return { events, remainder };
}
