import { z } from "zod";

import {
  createMaxwellMessage,
  createMaxwellThread,
  getMaxwellThread,
  linkMaxwellAttachmentsToMessage,
  renameMaxwellThread,
  updateMaxwellMessage,
} from "@/lib/maxwell/repository";
import { maxwellErrorMessage, runMaxwellTurn } from "@/lib/maxwell/gemini";
import type { MaxwellStreamEvent } from "@/lib/maxwell/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z
  .object({
    threadId: z.string().uuid().optional(),
    clientMessageId: z.string().uuid(),
    text: z.string().max(100_000).default(""),
    attachmentIds: z.array(z.string().uuid()).max(6).default([]),
    pageContext: z
      .object({
        pathname: z.string().max(500),
        applicationId: z.string().uuid().optional(),
        documentId: z.string().uuid().optional(),
        documentKind: z
          .enum(["master_resume", "resume_version", "cover_letter"])
          .optional(),
      })
      .optional(),
  })
  .refine((value) => value.text.trim() || value.attachmentIds.length, {
    message: "Write a message or attach a document.",
  });

function titleFromMessage(text: string, hasAttachments: boolean) {
  if (!text.trim()) return hasAttachments ? "Imported documents" : "New conversation";
  return text.trim().replace(/\s+/g, " ").slice(0, 72);
}
export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "Maxwell is not configured yet. Add GEMINI_API_KEY to the server environment." },
      { status: 503 },
    );
  }

  let body: z.infer<typeof schema>;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid message." }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    let thread = body.threadId ? (await getMaxwellThread(body.threadId))?.thread : null;
    const isNew = !thread;
    if (!thread) {
      thread = await createMaxwellThread(
        titleFromMessage(body.text, body.attachmentIds.length > 0),
      );
    }

    const effectiveText =
      body.text.trim() || "Import these uploaded documents into my workspace.";
    const userMessage = await createMaxwellMessage({
      threadId: thread.id,
      role: "user",
      content: effectiveText,
      metadata: { page_context: body.pageContext ?? null },
      clientMessageId: body.clientMessageId,
    });
    await linkMaxwellAttachmentsToMessage(thread.id, userMessage.id, body.attachmentIds);

    if (!isNew && thread.title === "New conversation") {
      thread = await renameMaxwellThread(
        thread.id,
        titleFromMessage(body.text, body.attachmentIds.length > 0),
      );
    }

    const assistantMessage = await createMaxwellMessage({
      threadId: thread.id,
      role: "assistant",
      content: "",
      metadata: {},
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = async (event: MaxwellStreamEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        try {
          await emit({ type: "thread", thread });
          await emit({ type: "message_start", messageId: assistantMessage.id });
          const content = await runMaxwellTurn({
            threadId: thread.id,
            assistantMessageId: assistantMessage.id,
            currentUserMessage: body.text,
            attachmentIds: body.attachmentIds,
            pageContext: body.pageContext,
            signal: request.signal,
            emit,
          });
          await updateMaxwellMessage(assistantMessage.id, content);
          const completedThread = await getMaxwellThread(thread.id);
          const completedMessage = completedThread?.messages.find(
            (message) => message.id === assistantMessage.id,
          );
          if (completedMessage) {
            await emit({ type: "message_done", message: completedMessage });
          }
        } catch (error) {
          const message = maxwellErrorMessage(error);
          await updateMaxwellMessage(assistantMessage.id, message, { failed: true });
          await emit({ type: "error", message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not start Maxwell." },
      { status: 400 },
    );
  }
}
