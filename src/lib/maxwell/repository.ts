import "server-only";

import { createClient } from "@/lib/supabase/server";
import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import {
  extractAttachmentText,
  isMaxwellAttachmentMimeType,
  MAXWELL_MAX_FILE_SIZE,
} from "@/lib/maxwell/attachments";
import type {
  MaxwellAction,
  MaxwellAttachment,
  MaxwellMessage,
  MaxwellThread,
  MaxwellThreadDetail,
} from "@/lib/maxwell/types";
import type {
  AssistantActionStatus,
  AssistantMessageRole,
  Database,
  Json,
} from "@/types/database";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type ThreadRow = Database["public"]["Tables"]["assistant_threads"]["Row"];
type MessageRow = Database["public"]["Tables"]["assistant_messages"]["Row"];
type AttachmentRow = Database["public"]["Tables"]["assistant_attachments"]["Row"];
type ActionRow = Database["public"]["Tables"]["assistant_actions"]["Row"];

export async function getMaxwellAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be signed in to use Maxwell.");
  }

  return { supabase, userId: user.id };
}
function toThread(row: ThreadRow): MaxwellThread {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAttachment(row: AttachmentRow): MaxwellAttachment {
  return {
    id: row.id,
    threadId: row.thread_id,
    messageId: row.message_id,
    filePath: row.file_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

export function toAction(row: ActionRow): MaxwellAction {
  return {
    id: row.id,
    threadId: row.thread_id,
    messageId: row.message_id,
    toolName: row.tool_name,
    arguments: row.arguments,
    status: row.status,
    requiresConfirmation: row.requires_confirmation,
    authorizationEvidence: row.authorization_evidence,
    result: row.result,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMessage(
  row: MessageRow,
  attachments: MaxwellAttachment[] = [],
  actions: MaxwellAction[] = [],
): MaxwellMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    metadata: row.metadata,
    clientMessageId: row.client_message_id,
    createdAt: row.created_at,
    attachments,
    actions,
  };
}

export async function listMaxwellThreads(): Promise<MaxwellThread[]> {
  const { supabase, userId } = await getMaxwellAuthContext();
  const { data, error } = await supabase
    .from("assistant_threads")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(toThread);
}

export async function createMaxwellThread(title = "New conversation") {
  const { supabase, userId } = await getMaxwellAuthContext();
  const safeTitle = title.trim().slice(0, 160) || "New conversation";
  const { data, error } = await supabase
    .from("assistant_threads")
    .insert({ user_id: userId, title: safeTitle })
    .select("*")
    .single();
  if (error) throw error;
  return toThread(data);
}

export async function getMaxwellThread(id: string): Promise<MaxwellThreadDetail | null> {
  const { supabase, userId } = await getMaxwellAuthContext();
  const threadResult = await supabase
    .from("assistant_threads")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (threadResult.error) throw threadResult.error;
  if (!threadResult.data) return null;

  const [messagesResult, attachmentsResult, actionsResult] = await Promise.all([
    supabase
      .from("assistant_messages")
      .select("*")
      .eq("thread_id", id)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("assistant_attachments")
      .select("*")
      .eq("thread_id", id)
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("assistant_actions")
      .select("*")
      .eq("thread_id", id)
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);
  const error = messagesResult.error ?? attachmentsResult.error ?? actionsResult.error;
  if (error) throw error;

  const attachments = (attachmentsResult.data ?? []).map(toAttachment);
  const actions = (actionsResult.data ?? []).map(toAction);
  return {
    thread: toThread(threadResult.data),
    messages: (messagesResult.data ?? []).map((message) =>
      toMessage(
        message,
        attachments.filter((item) => item.messageId === message.id),
        actions.filter((item) => item.messageId === message.id),
      ),
    ),
  };
}

export async function renameMaxwellThread(id: string, title: string) {
  const { supabase, userId } = await getMaxwellAuthContext();
  const safeTitle = title.trim().slice(0, 160);
  if (!safeTitle) throw new Error("Conversation title is required.");
  const { data, error } = await supabase
    .from("assistant_threads")
    .update({ title: safeTitle })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return toThread(data);
}

export async function deleteMaxwellThread(id: string) {
  const { supabase, userId } = await getMaxwellAuthContext();
  const { data: attachments, error: readError } = await supabase
    .from("assistant_attachments")
    .select("file_path")
    .eq("thread_id", id)
    .eq("user_id", userId);
  if (readError) throw readError;

  const { error } = await supabase
    .from("assistant_threads")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;

  const paths = (attachments ?? []).map((item) => item.file_path);
  if (paths.length) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove(paths);
  }
}

export async function touchMaxwellThread(
  supabase: SupabaseClient,
  userId: string,
  threadId: string,
) {
  const { error } = await supabase
    .from("assistant_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function createMaxwellMessage(input: {
  threadId: string;
  role: AssistantMessageRole;
  content: string;
  metadata?: Json;
  clientMessageId?: string | null;
}) {
  const { supabase, userId } = await getMaxwellAuthContext();

  if (input.clientMessageId) {
    const existing = await supabase
      .from("assistant_messages")
      .select("*")
      .eq("user_id", userId)
      .eq("client_message_id", input.clientMessageId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return toMessage(existing.data);
  }

  const { data, error } = await supabase
    .from("assistant_messages")
    .insert({
      thread_id: input.threadId,
      user_id: userId,
      role: input.role,
      content: input.content,
      metadata: input.metadata ?? {},
      client_message_id: input.clientMessageId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  await touchMaxwellThread(supabase, userId, input.threadId);
  return toMessage(data);
}

export async function updateMaxwellMessage(id: string, content: string, metadata: Json = {}) {
  const { supabase, userId } = await getMaxwellAuthContext();
  const { data, error } = await supabase
    .from("assistant_messages")
    .update({ content, metadata })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return toMessage(data);
}

export async function linkMaxwellAttachmentsToMessage(
  threadId: string,
  messageId: string,
  attachmentIds: string[],
) {
  if (!attachmentIds.length) return [];
  const { supabase, userId } = await getMaxwellAuthContext();
  const { data, error } = await supabase
    .from("assistant_attachments")
    .update({ message_id: messageId })
    .in("id", attachmentIds)
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .is("message_id", null)
    .select("*");
  if (error) throw error;
  return (data ?? []).map(toAttachment);
}

export async function registerMaxwellAttachment(input: {
  threadId: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const { supabase, userId } = await getMaxwellAuthContext();
  if (!input.filePath.startsWith(`${userId}/assistant/${input.threadId}/`)) {
    throw new Error("Invalid assistant attachment path.");
  }
  if (!isMaxwellAttachmentMimeType(input.mimeType)) {
    throw new Error("Maxwell accepts PDF and DOCX files only.");
  }
  if (input.sizeBytes < 1 || input.sizeBytes > MAXWELL_MAX_FILE_SIZE) {
    throw new Error("Files must be 10 MB or smaller.");
  }

  const { data: thread, error: threadError } = await supabase
    .from("assistant_threads")
    .select("id")
    .eq("id", input.threadId)
    .eq("user_id", userId)
    .maybeSingle();
  if (threadError || !thread) {
    throw threadError ?? new Error("Conversation not found.");
  }

  const downloaded = await supabase.storage.from(DOCUMENT_BUCKET).download(input.filePath);
  if (downloaded.error) throw downloaded.error;
  const buffer = Buffer.from(await downloaded.data.arrayBuffer());
  if (buffer.byteLength !== input.sizeBytes) {
    throw new Error("The uploaded file size did not match the request.");
  }
  const extractedText = await extractAttachmentText(buffer, input.mimeType);

  const { data, error } = await supabase
    .from("assistant_attachments")
    .insert({
      thread_id: input.threadId,
      user_id: userId,
      file_path: input.filePath,
      file_name: input.fileName.slice(0, 255),
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      extracted_text: extractedText,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toAttachment(data);
}

export async function getMaxwellAttachmentContext(
  threadId: string,
  attachmentIds: string[],
) {
  if (!attachmentIds.length) return [];
  const { supabase, userId } = await getMaxwellAuthContext();
  const { data, error } = await supabase
    .from("assistant_attachments")
    .select("id, file_name, mime_type, file_path, extracted_text")
    .in("id", attachmentIds)
    .eq("thread_id", threadId)
    .eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function createMaxwellAction(input: {
  threadId: string;
  messageId?: string | null;
  toolName: string;
  arguments: Json;
  status: AssistantActionStatus;
  requiresConfirmation: boolean;
  authorizationEvidence?: string | null;
  result?: Json | null;
  error?: string | null;
  idempotencyKey?: string;
}) {
  const { supabase, userId } = await getMaxwellAuthContext();
  const { data, error } = await supabase
    .from("assistant_actions")
    .insert({
      thread_id: input.threadId,
      message_id: input.messageId ?? null,
      user_id: userId,
      tool_name: input.toolName,
      arguments: input.arguments,
      status: input.status,
      requires_confirmation: input.requiresConfirmation,
      authorization_evidence: input.authorizationEvidence ?? null,
      result: input.result ?? null,
      error: input.error ?? null,
      idempotency_key: input.idempotencyKey,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toAction(data);
}

export async function getMaxwellAction(id: string) {
  const { supabase, userId } = await getMaxwellAuthContext();
  const { data, error } = await supabase
    .from("assistant_actions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? toAction(data) : null;
}

export async function updateMaxwellAction(
  id: string,
  input: {
    status: AssistantActionStatus;
    result?: Json | null;
    error?: string | null;
  },
) {
  const { supabase, userId } = await getMaxwellAuthContext();
  const { data, error } = await supabase
    .from("assistant_actions")
    .update({
      status: input.status,
      result: input.result ?? null,
      error: input.error ?? null,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return toAction(data);
}
