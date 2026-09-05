export class ByteLimitExceededError extends Error {
  constructor() {
    super("The response body exceeded its byte limit.");
    this.name = "ByteLimitExceededError";
  }
}

export async function readBoundedBytes(
  stream: ReadableStream<Uint8Array>,
  maxBytes: number,
) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      try {
        await reader.cancel();
      } catch {
        // The byte-limit error is authoritative even if the source rejects cancellation.
      }
      throw new ByteLimitExceededError();
    }
    chunks.push(value);
  }

  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}
