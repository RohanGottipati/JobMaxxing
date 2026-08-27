import "server-only";

import {
  GoogleGenAI,
  type Content,
  type FunctionCall,
  type Part,
} from "@google/genai";

import { getValidatedMaxwellPageContext } from "@/lib/maxwell/context";
import {
  getMaxwellAttachmentContext,
  getMaxwellThread,
} from "@/lib/maxwell/repository";
import {
  buildMaxwellTurnContext,
  MAXWELL_SYSTEM_PROMPT,
} from "@/lib/maxwell/prompt";
import {
  executeMaxwellToolCall,
  MAXWELL_TOOL_DECLARATIONS,
  type ToolExecutionEvent,
} from "@/lib/maxwell/tools";
import type {
  MaxwellPageContext,
  MaxwellStreamEvent,
} from "@/lib/maxwell/types";

const MAX_TOOL_CALLS_PER_TURN = 6;
const MAX_HISTORY_MESSAGES = 20;

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Maxwell is not configured yet. Add GEMINI_API_KEY to the server environment.");
  }
  return new GoogleGenAI({ apiKey });
}
function appendContextToLatestUser(contents: Content[], context: string) {
  if (!context) return;
  for (let index = contents.length - 1; index >= 0; index -= 1) {
    if (contents[index]?.role === "user") {
      contents[index] = {
        ...contents[index],
        parts: [...(contents[index]?.parts ?? []), { text: `\n\n${context}` }],
      };
      return;
    }
  }
}

function collectStreamParts(target: Part[], incoming: Part[]) {
  for (const part of incoming) {
    target.push(part);
  }
}

function functionCallsFromParts(parts: Part[]) {
  const calls = parts
    .map((part) => part.functionCall)
    .filter((call): call is FunctionCall => Boolean(call?.name));
  const seen = new Set<string>();
  return calls.filter((call) => {
    const key = call.id || `${call.name}:${JSON.stringify(call.args ?? {})}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function friendlyGeminiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Gemini request failed.";
  if (/429|quota|rate limit/i.test(message)) {
    return "Gemini's free-tier limit was reached. Wait a moment and try again.";
  }
  if (/503|unavailable|overloaded/i.test(message)) {
    return "Gemini is temporarily busy. Try again in a moment.";
  }
  return message;
}

export async function runMaxwellTurn(input: {
  threadId: string;
  assistantMessageId: string;
  currentUserMessage: string;
  attachmentIds: string[];
  pageContext?: MaxwellPageContext;
  signal?: AbortSignal;
  emit: (event: MaxwellStreamEvent) => Promise<void> | void;
}) {
  const ai = createGeminiClient();
  const detail = await getMaxwellThread(input.threadId);
  if (!detail) throw new Error("Conversation not found.");

  const history = detail.messages
    .filter((message) => message.content.trim() && message.id !== input.assistantMessageId)
    .slice(-MAX_HISTORY_MESSAGES);
  const contents: Content[] = history.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  const [attachments, validatedPageContext] = await Promise.all([
    getMaxwellAttachmentContext(input.threadId, input.attachmentIds),
    getValidatedMaxwellPageContext(input.pageContext),
  ]);
  appendContextToLatestUser(
    contents,
    buildMaxwellTurnContext({
      currentDate: new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Toronto",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
      pageContext: validatedPageContext,
      attachments: attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.file_name,
        text: attachment.extracted_text ?? "[No text extracted]",
      })),
    }),
  );

  let fullText = "";
  let totalToolCalls = 0;

  while (totalToolCalls <= MAX_TOOL_CALLS_PER_TURN) {
    const response = await ai.models.generateContentStream({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: MAXWELL_SYSTEM_PROMPT,
        temperature: 0.55,
        maxOutputTokens: 8_192,
        abortSignal: input.signal,
        tools:
          totalToolCalls < MAX_TOOL_CALLS_PER_TURN
            ? [{ functionDeclarations: MAXWELL_TOOL_DECLARATIONS }]
            : undefined,
      },
    });

    const modelParts: Part[] = [];
    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts ?? [];
      collectStreamParts(modelParts, parts);
      const delta = parts.map((part) => part.text ?? "").join("");
      if (delta) {
        fullText += delta;
        await input.emit({ type: "message_delta", delta });
      }
    }

    if (!modelParts.length) {
      throw new Error("Gemini returned an empty response.");
    }
    contents.push({ role: "model", parts: modelParts });
    const calls = functionCallsFromParts(modelParts);
    if (!calls.length) break;

    totalToolCalls += calls.length;
    const responseParts: Part[] = [];
    for (const call of calls) {
      if (totalToolCalls > MAX_TOOL_CALLS_PER_TURN) {
        responseParts.push({
          functionResponse: {
            id: call.id,
            name: call.name,
            response: { error: "Maxwell reached the six-action limit for this turn." },
          },
        });
        continue;
      }

      const result = await executeMaxwellToolCall(call, {
        threadId: input.threadId,
        assistantMessageId: input.assistantMessageId,
        currentUserMessage: input.currentUserMessage,
        attachmentCount: input.attachmentIds.length,
        emit: async (event: ToolExecutionEvent) => {
          await input.emit(event);
        },
      });
      responseParts.push({
        functionResponse: {
          id: call.id,
          name: call.name,
          response: { output: result },
        },
      });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  if (!fullText.trim()) {
    fullText = "Done. I updated your workspace.";
    await input.emit({ type: "message_delta", delta: fullText });
  }
  return fullText;
}

export function maxwellErrorMessage(error: unknown) {
  return friendlyGeminiError(error);
}
