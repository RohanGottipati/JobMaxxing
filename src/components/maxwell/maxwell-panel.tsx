"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  Bot,
  Check,
  CircleStop,
  ExternalLink,
  FileText,
  History,
  Loader2,
  Menu,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
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

function contextLabel(pathname: string) {
  if (/^\/applications\//.test(pathname)) return "Application context";
  if (/^\/resumes\/versions\//.test(pathname)) return "Tailored resume context";
  if (/^\/resumes\//.test(pathname)) return "Master resume context";
  if (/^\/cover-letters\//.test(pathname)) return "Cover letter context";
  if (pathname === "/applications") return "Applications context";
  if (pathname === "/profile") return "Career profile context";
  return "Workspace context";
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
    <div className={user ? "motion-rise ml-5 sm:ml-12" : "motion-rise mr-2 sm:mr-8"}>
      <div className="mb-1 flex items-center gap-1.5 text-[0.66rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {user ? "You" : <><Bot className="size-3" />Maxwell</>}
      </div>
      <div className={user ? "rounded-2xl rounded-tr-sm bg-primary px-3.5 py-3 text-sm leading-6 text-primary-foreground shadow-sm" : "rounded-2xl rounded-tl-sm border border-border bg-card px-3.5 py-3 text-sm leading-6 shadow-paper"}>
        <div className="whitespace-pre-wrap break-words">{message.content || <span className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />Thinking…</span>}</div>
        {message.attachments.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.attachments.map((attachment) => (
              <span key={attachment.id} className={user ? "inline-flex min-w-0 items-center gap-1 rounded-md bg-white/12 px-2 py-1 text-[0.7rem]" : "inline-flex min-w-0 items-center gap-1 rounded-md bg-muted px-2 py-1 text-[0.7rem] text-muted-foreground"}>
                <FileText className="size-3 shrink-0" /><span className="truncate">{attachment.fileName}</span>
              </span>
            ))}
          </div>
        ) : null}
        {!user ? message.actions.map((action) => <ActionCard key={action.id} action={action} onDecision={onDecision} />) : null}
      </div>
    </div>
  );
}

function ConversationHistory({
  activeThreadId,
  loading,
  onSelect,
  threads,
}: {
  activeThreadId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  threads: MaxwellThread[];
}) {
  if (loading && !threads.length) {
    return (
      <div className="grid min-h-40 place-items-center text-muted-foreground">
        <Loader2 aria-label="Loading conversations" className="size-4 animate-spin" />
      </div>
    );
  }

  if (!threads.length) {
    return (
      <div className="m-3 rounded-xl border border-dashed border-border-strong bg-background/55 p-4 text-center">
        <History aria-hidden className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-2 text-xs font-medium">No conversations yet</p>
        <p className="mt-1 text-[0.7rem] leading-5 text-muted-foreground">Start a chat and it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-1 p-2">
      {threads.map((thread, index) => {
        const active = thread.id === activeThreadId;
        return (
          <button
            key={thread.id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onSelect(thread.id)}
            className="motion-list-item group relative min-w-0 rounded-lg px-3 py-2.5 text-left transition duration-200 hover:-translate-y-0.5 hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:shadow-sm"
            data-active={active}
            style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
          >
            <span className="block truncate text-[0.8rem] font-medium">{thread.title}</span>
            <span className="mt-1 block truncate text-[0.67rem] text-muted-foreground">
              {thread.summary || new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(thread.updatedAt))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function MaxwellPanel({
  initialContextPath,
  initialThreadId,
  userId,
}: {
  initialContextPath?: string | null;
  initialThreadId?: string | null;
  userId: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageViewportRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loadRequestRef = useRef(0);
  const suppressAbortErrorRef = useRef(false);
  const [threads, setThreads] = useState<MaxwellThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MaxwellMessage[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<MaxwellAttachment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextPath, setContextPath] = useState(initialContextPath ?? null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [followingLatest, setFollowingLatest] = useState(true);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const loadThreads = useCallback(async () => {
    const response = await fetch("/api/maxwell/threads", { cache: "no-store" });
    if (!response.ok) throw new Error(await readError(response));
    const body = (await response.json()) as { threads: MaxwellThread[] };
    setThreads(body.threads);
  }, []);

  const loadThread = useCallback(async (id: string) => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setError(null);
    setFollowingLatest(true);
    try {
      const response = await fetch(`/api/maxwell/threads/${id}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await readError(response));
      const body = (await response.json()) as { thread: MaxwellThread; messages: MaxwellMessage[] };
      if (requestId !== loadRequestRef.current) return;
      setMessages(body.messages);
      setPendingAttachments([]);
    } catch (loadError) {
      if (requestId === loadRequestRef.current) {
        setError(loadError instanceof Error ? loadError.message : "Could not load conversation.");
      }
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/maxwell/threads", { cache: "no-store" });
        if (!response.ok) throw new Error(await readError(response));
        const body = (await response.json()) as { threads: MaxwellThread[] };
        if (cancelled) return;
        setThreads(body.threads);
        if (initialThreadId && body.threads.some((thread) => thread.id === initialThreadId)) {
          setActiveThreadId(initialThreadId);
          await loadThread(initialThreadId);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load Maxwell.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [initialThreadId, loadThread]);

  useEffect(() => {
    const viewport = messageViewportRef.current;
    if (!viewport || !followingLatest) return;
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "auto",
    });
  }, [followingLatest, messages, sending]);

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
    syncRoute(body.thread.id);
    return body.thread;
  }

  function startNewChat() {
    suppressAbortErrorRef.current = true;
    abortRef.current?.abort();
    loadRequestRef.current += 1;
    setActiveThreadId(null);
    setMessages([]);
    setPendingAttachments([]);
    setText("");
    setError(null);
    setFollowingLatest(true);
    setHistoryOpen(false);
    syncRoute(null);
  }

  function syncRoute(threadId: string | null, nextContext = contextPath) {
    const params = new URLSearchParams();
    if (nextContext) params.set("from", nextContext);
    if (threadId) params.set("thread", threadId);
    const query = params.toString();
    window.history.replaceState(null, "", `/maxwell${query ? `?${query}` : ""}`);
  }

  function selectThread(id: string) {
    setActiveThreadId(id);
    setHistoryOpen(false);
    syncRoute(id);
    void loadThread(id);
  }

  function openRenameDialog() {
    const current = threads.find((thread) => thread.id === activeThreadId);
    setRenameTitle(current?.title ?? "");
    setRenameOpen(true);
  }

  async function renameActiveThread() {
    if (!activeThreadId || !renameTitle.trim()) return;
    const response = await fetch(`/api/maxwell/threads/${activeThreadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: renameTitle.trim() }),
    });
    if (!response.ok) return toast.error(await readError(response));
    const body = (await response.json()) as { thread: MaxwellThread };
    setThreads((items) => items.map((item) => item.id === body.thread.id ? body.thread : item));
    setRenameOpen(false);
    toast.success("Conversation renamed");
  }

  async function deleteActiveThread() {
    if (!activeThreadId) return;
    const response = await fetch(`/api/maxwell/threads/${activeThreadId}`, { method: "DELETE" });
    if (!response.ok) return toast.error(await readError(response));
    setThreads((items) => items.filter((item) => item.id !== activeThreadId));
    setDeleteOpen(false);
    startNewChat();
    toast.success("Conversation deleted");
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
    setFollowingLatest(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    suppressAbortErrorRef.current = false;
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
          pageContext: pageContext(contextPath ?? "/maxwell"),
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
            syncRoute(event.thread.id);
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
        if (!suppressAbortErrorRef.current) setError("Response stopped.");
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

  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? null;

  function removeContext() {
    setContextPath(null);
    syncRoute(activeThreadId, null);
  }

  return (
    <section className="flex min-h-0 flex-1 overflow-hidden bg-background" aria-label="Maxwell assistant">
      <aside className="hidden w-68 shrink-0 flex-col border-r border-border bg-sidebar/80 md:flex">
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-3">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <History aria-hidden className="size-4 text-primary" />Conversations
          </span>
          <Button variant="outline" size="icon-sm" onClick={startNewChat} aria-label="New conversation">
            <MessageSquarePlus />
          </Button>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <ConversationHistory activeThreadId={activeThreadId} loading={loading} onSelect={selectThread} threads={threads} />
        </ScrollArea>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-14 shrink-0 items-center gap-2 border-b border-border bg-background/92 px-3 py-2 backdrop-blur-md sm:px-4">
          <Button variant="ghost" size="icon-sm" onClick={() => setHistoryOpen(true)} aria-label="Open conversation history" className="md:hidden">
            <Menu />
          </Button>
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-paper">
            <Sparkles className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{activeThread?.title || "New conversation"}</span>
            <span className="hidden text-[0.67rem] text-muted-foreground sm:block">Maxwell · Your JobMaxxing workspace assistant</span>
          </span>
          <Button variant="ghost" size="icon-sm" disabled={!activeThreadId} onClick={openRenameDialog} aria-label="Rename conversation">
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon-sm" disabled={!activeThreadId} onClick={() => setDeleteOpen(true)} aria-label="Delete conversation" className="text-destructive hover:text-destructive">
            <Trash2 />
          </Button>
          <Button variant="outline" size="sm" onClick={startNewChat} className="hidden sm:inline-flex">
            <MessageSquarePlus />New chat
          </Button>
        </header>

        {contextPath ? (
          <div className="motion-drop flex shrink-0 items-center justify-center border-b border-border bg-info/[0.055] px-3 py-2">
            <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-info/25 bg-background/80 px-3 py-1 text-xs text-info shadow-sm">
              <Sparkles aria-hidden className="size-3 shrink-0" />
              <Link href={contextPath} className="truncate font-medium hover:underline">{contextLabel(contextPath)}</Link>
              <button type="button" onClick={removeContext} aria-label="Remove page context" className="-mr-1 grid size-6 place-items-center rounded-full transition hover:bg-info/10">
                <X aria-hidden className="size-3" />
              </button>
            </span>
          </div>
        ) : null}

        <div className="relative min-h-0 flex-1">
          <ScrollArea
            className="h-full"
            viewportClassName="overscroll-contain"
            viewportRef={messageViewportRef}
            onViewportScroll={(event) => {
              const viewport = event.currentTarget;
              setFollowingLatest(viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 96);
            }}
          >
            <div className="mx-auto w-full max-w-3xl space-y-5 px-3 py-5 sm:px-6 sm:py-7">
              {loading && !messages.length ? (
                <div className="grid min-h-64 place-items-center text-sm text-muted-foreground">
                  <span className="text-center"><Loader2 className="mx-auto mb-3 size-5 animate-spin" />Loading conversation…</span>
                </div>
              ) : null}
              {!loading && !messages.length ? (
                <div className="motion-rise mx-auto grid max-w-lg gap-6 py-8 text-center sm:py-14">
                  <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-border bg-card text-primary shadow-[0_12px_32px_-20px_rgb(41_40_36/0.45)]">
                    <Bot className="size-7" />
                  </span>
                  <div>
                    <h1 className="text-xl font-semibold tracking-[-0.03em]">What are we working on?</h1>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Drop in a job description, resume, and cover letter—or ask Maxwell anything about your workspace.</p>
                  </div>
                  <div className="grid gap-2 text-left sm:grid-cols-3">
                    {["Which applications are missing documents?", "Assess my tailored resume for this job", "Create a LaTeX resume for this role"].map((prompt, index) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setText(prompt)}
                        className="motion-list-item rounded-xl border border-border bg-card px-3 py-3 text-xs leading-5 shadow-paper transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:bg-primary/[0.035] hover:shadow-md"
                        style={{ animationDelay: `${index * 80 + 100}ms` }}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {messages.map((message) => <MessageBubble key={message.id} message={message} onDecision={handleDecision} />)}
            </div>
          </ScrollArea>
          {!followingLatest ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFollowingLatest(true);
                messageViewportRef.current?.scrollTo({ top: messageViewportRef.current.scrollHeight, behavior: "smooth" });
              }}
              className="motion-pop absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/95 shadow-lg backdrop-blur"
            >
              <ArrowDown />Jump to latest
            </Button>
          ) : null}
        </div>

        <footer className="shrink-0 border-t border-border bg-elevated/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-5">
          <div className="mx-auto max-w-3xl">
            {error ? <div className="motion-drop mb-2 flex items-start gap-2 rounded-lg bg-destructive/8 px-3 py-2 text-xs text-destructive"><TriangleAlert className="mt-0.5 size-3.5 shrink-0" /><span className="min-w-0 flex-1">{error}</span><button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><X className="size-3.5" /></button></div> : null}
            {pendingAttachments.length ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {pendingAttachments.map((attachment) => (
                  <span key={attachment.id} className="motion-pop inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-[0.68rem]">
                    <FileText className="size-3 shrink-0" /><span className="max-w-48 truncate">{attachment.fileName}</span>
                    <button type="button" onClick={() => setPendingAttachments((items) => items.filter((item) => item.id !== attachment.id))} aria-label={`Remove ${attachment.fileName}`} className="grid size-5 place-items-center rounded hover:bg-background"><X className="size-3" /></button>
                  </span>
                ))}
              </div>
            ) : null}
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(event) => void uploadFile(event.target.files?.[0])} />
            <div className="rounded-2xl border border-border bg-background p-1.5 shadow-[0_8px_28px_-20px_rgb(41_40_36/0.5)] transition duration-200 focus-within:-translate-y-0.5 focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/10 focus-within:shadow-lg">
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
                className="min-h-16 max-h-40 resize-none border-0 bg-transparent px-2 py-1.5 text-sm shadow-none focus-visible:ring-0 sm:min-h-20"
                disabled={sending}
              />
              <div className="flex items-center gap-1 border-t border-border/70 pt-1.5">
                <Button variant="ghost" size="icon-sm" disabled={uploading || sending} onClick={() => fileInputRef.current?.click()} aria-label="Attach PDF or DOCX">{uploading ? <Loader2 className="animate-spin" /> : <Paperclip />}</Button>
                <span className="min-w-0 flex-1 truncate text-[0.62rem] text-muted-foreground">PDF/DOCX · private · 10 MB</span>
                {sending ? <Button variant="outline" size="sm" onClick={() => abortRef.current?.abort()}><CircleStop />Stop</Button> : <Button size="sm" disabled={!text.trim() && !pendingAttachments.length} onClick={() => void sendMessage()}><Send />Send</Button>}
              </div>
            </div>
            <p className="mt-1.5 hidden text-center text-[0.6rem] leading-4 text-muted-foreground sm:block">Creative drafts may include claims marked for your review.</p>
          </div>
        </footer>
      </div>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-[min(88vw,22rem)] gap-0 p-0 sm:max-w-sm">
          <SheetTitle className="sr-only">Maxwell conversation history</SheetTitle>
          <SheetDescription className="sr-only">Choose a saved conversation or start a new one.</SheetDescription>
          <div className="flex h-14 items-center justify-between border-b border-border px-3">
            <span className="flex items-center gap-2 text-sm font-semibold"><History className="size-4 text-primary" />Conversations</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon-sm" onClick={startNewChat} aria-label="New conversation"><MessageSquarePlus /></Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setHistoryOpen(false)} aria-label="Close conversation history"><X /></Button>
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <ConversationHistory activeThreadId={activeThreadId} loading={loading} onSelect={selectThread} threads={threads} />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription>Give this Maxwell conversation a name that is easy to find later.</DialogDescription>
          </DialogHeader>
          <Input value={renameTitle} onChange={(event) => setRenameTitle(event.target.value)} maxLength={160} autoFocus onKeyDown={(event) => { if (event.key === "Enter") void renameActiveThread(); }} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={() => void renameActiveThread()} disabled={!renameTitle.trim()}>Save name</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this conversation?</DialogTitle>
            <DialogDescription>The conversation will be removed. Workspace records Maxwell created will remain.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void deleteActiveThread()}><Trash2 />Delete conversation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
