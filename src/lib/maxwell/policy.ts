export type MaxwellWriteToolName =
  | "create_application_package"
  | "create_document"
  | "update_application"
  | "move_application"
  | "update_document"
  | "update_profile_basics"
  | "add_profile_item"
  | "submit_document"
  | "delete_record";

const WRITE_INTENT =
  /\b(?:add|applied|apply|change|create|edit|generate|import|mark|move|put|rename|replace|save|send|sent|set|submit|tailor|update|use|used)\b|\b(?:do it|go ahead|please do|sounds good)\b|^yes\b/i;

function normalizeAuthorizationText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function hasExplicitWriteAuthorization(
  currentMessage: string,
  evidence: string,
) {
  const message = normalizeAuthorizationText(currentMessage);
  const quote = normalizeAuthorizationText(evidence);
  return quote.length >= 4 && message.includes(quote) && WRITE_INTENT.test(quote);
}

export function shouldConfirmMaxwellWrite(input: {
  name: MaxwellWriteToolName;
  currentMessage: string;
  evidence?: string;
  attachmentCount: number;
}) {
  if (input.name === "delete_record") return true;
  if (
    input.name === "create_application_package" &&
    input.attachmentCount >= 2 &&
    input.currentMessage.trim().length === 0
  ) {
    return false;
  }
  return !hasExplicitWriteAuthorization(
    input.currentMessage,
    input.evidence ?? "",
  );
}
