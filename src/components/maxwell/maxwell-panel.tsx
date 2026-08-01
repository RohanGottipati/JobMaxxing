"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  Check,
  ChevronDown,
  CircleStop,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquarePlus,
  Paperclip,
  Pencil,
  Send,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import type {
  MaxwellAction,
  MaxwellAttachment,
  MaxwellMessage,
  MaxwellPageContext,
  MaxwellThread,
} from "@/lib/maxwell/types";
import { parseMaxwellSseBuffer } from "@/lib/maxwell/sse";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function jsonObject(value: Json | null) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function safeFileName(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(-120) || "document"
  );
}

function pageContext(pathname: string): MaxwellPageContext {
  const context: MaxwellPageContext = { pathname };
  const application = pathname.match(/^\/applications\/([0-9a-f-]{36})(?:\/|$)/i);
  if (application?.[1]) context.applicationId = application[1];

  const tailored = pathname.match(/^\/resumes\/versions\/([0-9a-f-]{36})(?:\/|$)/i);
  const master = pathname.match(/^\/resumes\/([0-9a-f-]{36})(?:\/|$)/i);
  const letter = pathname.match(/^\/cover-letters\/([0-9a-f-]{36})(?:\/|$)/i);
  if (tailored?.[1]) {
    context.documentId = tailored[1];
    context.documentKind = "resume_version";
  } else if (master?.[1]) {
    context.documentId = master[1];
    context.documentKind = "master_resume";
  } else if (letter?.[1]) {
    context.documentId = letter[1];
    context.documentKind = "cover_letter";
  }
  return context;
}

function pendingMessage(
  id: string,
  threadId: string,
  role: "user" | "assistant",
  content: string,
  attachments: MaxwellAttachment[] = [],
): MaxwellMessage {
  return {
    id,
    threadId,
    role,
    content,
    metadata: {},
    clientMessageId: role === "user" ? id : null,
    createdAt: new Date().toISOString(),
    attachments,
    actions: [],
  };
}

function actionLabel(toolName: string) {
  const labels: Record<string, string> = {
    create_application_package: "Create application package",
    create_document: "Create document",
    update_application: "Update application",
    move_application: "Move application card",
    update_document: "Update document",
    update_profile_basics: "Update profile",
    add_profile_item: "Add profile item",
    submit_document: "Mark document submitted",
    delete_record: "Delete workspace record",
  };
  return labels[toolName] ?? toolName.replaceAll("_", " ");
}

function resultLink(action: MaxwellAction) {
  const result = jsonObject(action.result);
  for (const [key, value] of Object.entries(result)) {
    if (key.endsWith("_url") && typeof value === "string" && value.startsWith("/")) {
      return value;
    }
  }
  return null;
}

function unsupportedClaims(action: MaxwellAction) {
  const args = jsonObject(action.arguments);
  const candidates = [args.document, args.resume, args.cover_letter];
  return candidates.flatMap((candidate) => {
    const object = jsonObject((candidate ?? null) as Json | null);
    return Array.isArray(object.unsupported_claims)
      ? object.unsupported_claims.filter((claim): claim is string => typeof claim === "string")
      : [];
  });
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

function ActionCard({
  action,
  onDecision,
}: {
  action: MaxwellAction;
  onDecision: (id: string, decision: "confirm" | "decline") => Promise<void>;
}) {
  const [deciding, setDeciding] = useState(false);
  const link = resultLink(action);
  const claims = unsupportedClaims(action);

  async function decide(decision: "confirm" | "decline") {
    setDeciding(true);
    try {
      await onDecision(action.id, decision);
    } catch (decisionError) {
      toast.error(decisionError instanceof Error ? decisionError.message : "Could not complete action.");
    } finally {
      setDeciding(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-elevated p-3 text-xs shadow-paper">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          {action.status === "succeeded" ? <Check className="size-3.5" /> : action.status === "failed" ? <TriangleAlert className="size-3.5 text-destructive" /> : action.status === "running" ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium capitalize">{actionLabel(action.toolName)}</span>
          <span className="mt-0.5 block text-muted-foreground">
            {action.status === "pending" ? "Waiting for your confirmation" : action.status === "succeeded" ? "Completed" : action.status === "declined" ? "Declined" : action.status === "failed" ? action.error || "Failed" : "Working…"}
          </span>
        </span>
      </div>
      {claims.length ? (
        <div className="mt-2 rounded-md bg-warning/10 p-2 text-warning">
          <span className="font-medium">Review unsupported claims:</span>
          <ul className="mt-1 list-disc space-y-1 pl-4">{claims.map((claim) => <li key={claim}>{claim}</li>)}</ul>
        </div>
      ) : null}
      {action.status === "pending" ? (
        <div className="mt-3 flex gap-2">
          <Button size="sm" disabled={deciding} onClick={() => void decide("confirm")}>{deciding ? <Loader2 className="animate-spin" /> : <Check />}Confirm</Button>
          <Button size="sm" variant="outline" disabled={deciding} onClick={() => void decide("decline")}><X />Decline</Button>
        </div>
      ) : null}
      {link && action.status === "succeeded" ? (
        <Button asChild size="sm" variant="outline" className="mt-3">
          <Link href={link}>Open result <ExternalLink /></Link>
        </Button>
      ) : null}
    </div>
  );
}

function MessageBubble({
  message,
  onDecision,
}: {
  message: MaxwellMessage;
  onDecision: (id: string, decision: "confirm" | "decline") => Promise<void>;
}) {
  const user = message.role === "user";
  return (
    <div className={user ? "ml-8" : "mr-4"}>
      <div className="mb-1 flex items-center gap-1.5 text-[0.66rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {user ? "You" : <><Bot className="size-3" />Maxwell</>}
      </div>
      <div className={user ? "rounded-xl rounded-tr-sm bg-primary px-3.5 py-3 text-sm leading-6 text-primary-foreground" : "rounded-xl rounded-tl-sm border border-border bg-card px-3.5 py-3 text-sm leading-6 shadow-paper"}>
        <div className="whitespace-pre-wrap break-words">{message.content || <span className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />Thinking…</span>}</div>
        {message.attachments.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.attachments.map((attachment) => (
              <span key={attachment.id} className={user ? "inline-flex items-center gap-1 rounded-md bg-white/12 px-2 py-1 text-[0.7rem]" : "inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[0.7rem] text-muted-foreground"}>
                <FileText className="size-3" />{attachment.fileName}
              </span>
            ))}
          </div>
        ) : null}
        {!user ? message.actions.map((action) => <ActionCard key={action.id} action={action} onDecision={onDecision} />) : null}
      </div>
    </div>
  );
}

export function MaxwellPanel({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [threads, setThreads] = useState<MaxwellThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MaxwellMessage[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<MaxwellAttachment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    const response = await fetch("/api/maxwell/threads", { cache: "no-store" });
    if (!response.ok) throw new Error(await readError(response));
    const body = (await response.json()) as { threads: MaxwellThread[] };
    setThreads(body.threads);
  }, []);

  const loadThread = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/maxwell/threads/${id}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await readError(response));
      const body = (await response.json()) as { thread: MaxwellThread; messages: MaxwellMessage[] };
      setMessages(body.messages);
      setPendingAttachments([]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load conversation.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/maxwell/threads", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response));
        return response.json() as Promise<{ threads: MaxwellThread[] }>;
      })
      .then((body) => {
        if (!cancelled) setThreads(body.threads);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load Maxwell.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: sending ? "smooth" : "auto" });
  }, [messages, sending]);

  async function createThread() {
    const response = await fetch("/api/maxwell/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New conversation" }),
    });
    if (!response.ok) throw new Error(await readError(response));
    const body = (await response.json()) as { thread: MaxwellThread };
    setThreads((current) => [body.thread, ...current]);
    setActiveThreadId(body.thread.id);
    setMessages([]);
    return body.thread;
  }

  function startNewChat() {
    abortRef.current?.abort();
    setActiveThreadId(null);
    setMessages([]);
    setPendingAttachments([]);
    setText("");
    setError(null);
  }

  async function renameActiveThread() {
    if (!activeThreadId) return;
    const current = threads.find((thread) => thread.id === activeThreadId);
    const title = window.prompt("Conversation name", current?.title ?? "");
    if (!title?.trim()) return;
    const response = await fetch(`/api/maxwell/threads/${activeThreadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) return toast.error(await readError(response));
    const body = (await response.json()) as { thread: MaxwellThread };
    setThreads((items) => items.map((item) => item.id === body.thread.id ? body.thread : item));
  }

  async function deleteActiveThread() {
    if (!activeThreadId || !window.confirm("Delete this Maxwell conversation? Workspace records Maxwell created will remain.")) return;
    const response = await fetch(`/api/maxwell/threads/${activeThreadId}`, { method: "DELETE" });
    if (!response.ok) return toast.error(await readError(response));
    setThreads((items) => items.filter((item) => item.id !== activeThreadId));
    startNewChat();
  }

  async function uploadFile(file: File | undefined) {
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type)) return toast.error("Choose a PDF or DOCX file.");
    if (file.size > MAX_FILE_SIZE) return toast.error("Files must be 10 MB or smaller.");
    if (pendingAttachments.length >= 6) return toast.error("Attach up to six files per message.");

    setUploading(true);
    try {
      const thread = activeThreadId
        ? threads.find((item) => item.id === activeThreadId) ?? { id: activeThreadId }
        : await createThread();
      const path = `${userId}/assistant/${thread.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const supabase = createClient();
      const upload = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upload.error) throw upload.error;

      const response = await fetch("/api/maxwell/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: thread.id,
          filePath: path,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });
      if (!response.ok) {
        await supabase.storage.from(DOCUMENT_BUCKET).remove([path]);
        throw new Error(await readError(response));
      }
      const body = (await response.json()) as { attachment: MaxwellAttachment };
      setPendingAttachments((items) => [...items, body.attachment]);
      toast.success(`${file.name} is ready for Maxwell`);
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "Could not attach file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function applyActionEvent(action: MaxwellAction) {
    setMessages((current) =>
      current.map((message) =>
        message.role === "assistant" && message.id.startsWith("stream-")
          ? {
              ...message,
              actions: [
                ...message.actions.filter((item) => item.id !== action.id),
                action,
              ],
            }
          : message,
      ),
    );
  }

  async function handleDecision(id: string, decision: "confirm" | "decline") {
    const response = await fetch(`/api/maxwell/actions/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    if (!response.ok) throw new Error(await readError(response));
    const body = (await response.json()) as { action: MaxwellAction };
    setMessages((current) => current.map((message) => ({
      ...message,
      actions: message.actions.map((action) => action.id === id ? body.action : action),
    })));
    router.refresh();
  }

  async function sendMessage() {
    if (sending || (!text.trim() && !pendingAttachments.length)) return;
    const messageText = text.trim();
    const clientMessageId = crypto.randomUUID();
    const streamId = `stream-${crypto.randomUUID()}`;
    const currentThreadId = activeThreadId ?? "pending";
    setMessages((current) => [
      ...current,
      pendingMessage(clientMessageId, currentThreadId, "user", messageText || "Import these uploaded documents into my workspace.", pendingAttachments),
      pendingMessage(streamId, currentThreadId, "assistant", ""),
    ]);
    setText("");
    setPendingAttachments([]);
    setSending(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    let resolvedThreadId = activeThreadId;

    try {
      const response = await fetch("/api/maxwell/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: activeThreadId ?? undefined,
          clientMessageId,
          text: messageText,
          attachmentIds: pendingAttachments.map((attachment) => attachment.id),
          pageContext: pageContext(pathname),
        }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error(await readError(response));

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseMaxwellSseBuffer(buffer);
        buffer = parsed.remainder;
        for (const event of parsed.events) {
          if (event.type === "thread") {
            resolvedThreadId = event.thread.id;
            setActiveThreadId(event.thread.id);
            setThreads((items) => [event.thread, ...items.filter((item) => item.id !== event.thread.id)]);
          } else if (event.type === "message_delta") {
            setMessages((current) => current.map((message) => message.id === streamId ? { ...message, content: message.content + event.delta } : message));
          } else if (event.type === "action_pending" || event.type === "action_result") {
            applyActionEvent(event.action);
          } else if (event.type === "action_started") {
            // The pending/success event carries the full action object.
          } else if (event.type === "message_done") {
            setMessages((current) => current.map((message) => message.id === streamId ? event.message : message));
          } else if (event.type === "error") {
            setError(event.message);
          }
        }
      }

      if (resolvedThreadId) {
        await Promise.all([loadThread(resolvedThreadId), loadThreads()]);
      }
      router.refresh();
    } catch (sendError) {
      if (sendError instanceof DOMException && sendError.name === "AbortError") {
        setError("Response stopped.");
      } else {
        const message = sendError instanceof Error ? sendError.message : "Could not reach Maxwell.";
        setError(message);
        setMessages((current) => current.map((item) => item.id === streamId ? { ...item, content: message } : item));
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  return (
    <section className="flex h-full min-h-0 w-full flex-col bg-background" aria-label="Maxwell assistant">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
        <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-paper"><Sparkles className="size-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Maxwell</span>
          <span className="block text-[0.66rem] text-muted-foreground">Your JobMaxxing workspace assistant</span>
        </span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close Maxwell"><X /></Button>
      </header>

      <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-1.5 border-b border-border bg-parchment/35 p-2.5">
        <div className="relative min-w-0">
          <Select
            aria-label="Conversation"
            className="h-8 w-full appearance-none pr-8 text-xs"
            value={activeThreadId ?? ""}
            onChange={(event) => {
              const id = event.target.value;
              if (!id) return startNewChat();
              setActiveThreadId(id);
              void loadThread(id);
            }}
          >
            <option value="">New conversation</option>
            {threads.map((thread) => <option key={thread.id} value={thread.id}>{thread.title}</option>)}
          </Select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 size-3 text-muted-foreground" />
        </div>
        <Button variant="outline" size="icon-sm" onClick={startNewChat} aria-label="New conversation"><MessageSquarePlus /></Button>
        <Button variant="ghost" size="icon-sm" disabled={!activeThreadId} onClick={() => void renameActiveThread()} aria-label="Rename conversation"><Pencil /></Button>
        <Button variant="ghost" size="icon-sm" disabled={!activeThreadId} onClick={() => void deleteActiveThread()} aria-label="Delete conversation" className="text-destructive hover:text-destructive"><Trash2 /></Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 px-3 py-4">
          {loading && !messages.length ? <div className="grid min-h-48 place-items-center text-sm text-muted-foreground"><Loader2 className="mb-2 size-5 animate-spin" /></div> : null}
          {!loading && !messages.length ? (
            <div className="mx-auto grid max-w-sm gap-5 py-8 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-xl border border-border bg-card text-primary shadow-paper"><Bot className="size-6" /></span>
              <div><h2 className="font-semibold">What are we working on?</h2><p className="mt-1.5 text-xs leading-5 text-muted-foreground">Drop in a job description, resume, and cover letter—or ask Maxwell anything about your workspace.</p></div>
              <div className="grid gap-2 text-left">
                {["Which applications are missing documents?", "Assess my tailored resume for this job", "Create a LaTeX resume for this role"].map((prompt) => (
                  <button key={prompt} type="button" onClick={() => setText(prompt)} className="rounded-lg border border-border bg-card px-3 py-2.5 text-xs transition-colors hover:border-primary/40 hover:bg-primary/[0.035]">{prompt}</button>
                ))}
              </div>
            </div>
          ) : null}
          {messages.map((message) => <MessageBubble key={message.id} message={message} onDecision={handleDecision} />)}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <footer className="shrink-0 border-t border-border bg-elevated p-3">
        {error ? <div className="mb-2 flex items-start gap-2 rounded-md bg-destructive/8 px-2.5 py-2 text-xs text-destructive"><TriangleAlert className="mt-0.5 size-3.5 shrink-0" />{error}</div> : null}
        {pendingAttachments.length ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {pendingAttachments.map((attachment) => (
              <span key={attachment.id} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-[0.68rem]">
                <FileText className="size-3" /><span className="max-w-40 truncate">{attachment.fileName}</span>
                <button type="button" onClick={() => setPendingAttachments((items) => items.filter((item) => item.id !== attachment.id))} aria-label={`Remove ${attachment.fileName}`}><X className="size-3" /></button>
              </span>
            ))}
          </div>
        ) : null}
        <input ref={fileInputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(event) => void uploadFile(event.target.files?.[0])} />
        <div className="rounded-xl border border-border bg-background p-1.5 shadow-paper focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/10">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Ask Maxwell or drop in your job package…"
            className="min-h-20 resize-none border-0 bg-transparent px-2 py-1.5 text-sm shadow-none focus-visible:ring-0"
            disabled={sending}
          />
          <div className="flex items-center gap-1 border-t border-border/70 pt-1.5">
            <Button variant="ghost" size="icon-sm" disabled={uploading || sending} onClick={() => fileInputRef.current?.click()} aria-label="Attach PDF or DOCX">{uploading ? <Loader2 className="animate-spin" /> : <Paperclip />}</Button>
            <span className="flex-1 text-[0.62rem] text-muted-foreground">PDF/DOCX · private · 10 MB</span>
            {sending ? <Button variant="outline" size="sm" onClick={() => abortRef.current?.abort()}><CircleStop />Stop</Button> : <Button size="sm" disabled={!text.trim() && !pendingAttachments.length} onClick={() => void sendMessage()}><Send />Send</Button>}
          </div>
        </div>
        <p className="mt-2 text-center text-[0.6rem] leading-4 text-muted-foreground">Creative drafts may include claims marked for your review.</p>
      </footer>
    </section>
  );
}
