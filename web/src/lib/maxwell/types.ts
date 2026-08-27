import type {
  AssistantActionStatus,
  AssistantMessageRole,
  DocumentContentFormat,
  Json,
} from "@/types/database";

export type MaxwellThread = {
  id: string;
  title: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MaxwellAttachment = {
  id: string;
  threadId: string;
  messageId: string | null;
  filePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type MaxwellAction = {
  id: string;
  threadId: string;
  messageId: string | null;
  toolName: string;
  arguments: Json;
  status: AssistantActionStatus;
  requiresConfirmation: boolean;
  authorizationEvidence: string | null;
  result: Json | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MaxwellMessage = {
  id: string;
  threadId: string;
  role: AssistantMessageRole;
  content: string;
  metadata: Json;
  clientMessageId: string | null;
  createdAt: string;
  attachments: MaxwellAttachment[];
  actions: MaxwellAction[];
};

export type MaxwellThreadDetail = {
  thread: MaxwellThread;
  messages: MaxwellMessage[];
};

export type MaxwellPageContext = {
  pathname: string;
  applicationId?: string;
  documentId?: string;
  documentKind?: "master_resume" | "resume_version" | "cover_letter";
};

export type MaxwellStreamEvent =
  | { type: "thread"; thread: MaxwellThread }
  | { type: "message_start"; messageId: string }
  | { type: "message_delta"; delta: string }
  | { type: "action_pending"; action: MaxwellAction }
  | { type: "action_started"; actionId: string; toolName: string }
  | { type: "action_result"; action: MaxwellAction }
  | { type: "message_done"; message: MaxwellMessage }
  | { type: "error"; message: string };

export type MaxwellDocumentKind =
  | "master_resume"
  | "resume_version"
  | "cover_letter";

export type MaxwellDocumentFormat = DocumentContentFormat;
