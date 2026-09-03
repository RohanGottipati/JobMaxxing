import {
  MAX_LATEX_ASSETS,
  MAX_LATEX_ASSET_SIZE,
  MAX_LATEX_ASSET_TOTAL_SIZE,
} from "@/lib/latex/constants";

type AssetRule = { extensions: readonly string[]; contentType: string; magic?: readonly number[][] };

/**
 * Only formats pdfLaTeX/XeLaTeX can consume are accepted, and each is stored
 * under a single canonical content type so the bucket's MIME allowlist and the
 * compiler's virtual filesystem agree.
 */
const ASSET_RULES: readonly AssetRule[] = [
  { extensions: [".png"], contentType: "image/png", magic: [[0x89, 0x50, 0x4e, 0x47]] },
  { extensions: [".jpg", ".jpeg"], contentType: "image/jpeg", magic: [[0xff, 0xd8, 0xff]] },
  { extensions: [".pdf"], contentType: "application/pdf", magic: [[0x25, 0x50, 0x44, 0x46]] },
  { extensions: [".ttf"], contentType: "font/ttf", magic: [[0x00, 0x01, 0x00, 0x00], [0x74, 0x72, 0x75, 0x65]] },
  { extensions: [".otf"], contentType: "font/otf", magic: [[0x4f, 0x54, 0x54, 0x4f]] },
  { extensions: [".cls", ".sty", ".bib", ".bst"], contentType: "text/plain" },
];

export const LATEX_ASSET_ACCEPT = ASSET_RULES.flatMap((rule) => rule.extensions).join(",");

export function latexAssetContentType(fileName: string) {
  const lower = fileName.toLowerCase();
  const rule = ASSET_RULES.find((candidate) =>
    candidate.extensions.some((extension) => lower.endsWith(extension)),
  );
  return rule?.contentType ?? null;
}

export function safeLatexAssetName(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/-+\./g, ".")
    .replace(/^[._-]+/, "")
    .replace(/[._-]+$/, "");
  return normalized.slice(-120) || "asset";
}

export function validateLatexAssetName(fileName: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(fileName)) {
    return "Asset names may only use letters, numbers, dots, dashes, and underscores.";
  }
  if (fileName.includes("..")) return "Asset names cannot contain '..'.";
  if (!latexAssetContentType(fileName)) {
    return "Supported assets are PNG, JPEG, PDF, TTF, OTF, .cls, .sty, .bib, and .bst files.";
  }
  return null;
}

export function validateLatexAsset(
  file: Pick<File, "name" | "size">,
  existing: { count: number; totalBytes: number },
) {
  const nameError = validateLatexAssetName(safeLatexAssetName(file.name));
  if (nameError) return nameError;
  if (file.size <= 0) return "The selected file is empty.";
  if (file.size > MAX_LATEX_ASSET_SIZE) return "Each asset must be 5 MB or smaller.";
  if (existing.count >= MAX_LATEX_ASSETS) {
    return `A document can hold at most ${MAX_LATEX_ASSETS} supporting assets.`;
  }
  if (existing.totalBytes + file.size > MAX_LATEX_ASSET_TOTAL_SIZE) {
    return "Supporting assets must total 20 MB or less.";
  }
  return null;
}

/**
 * Extension checks alone let a renamed executable through, so binary formats
 * are also matched against their magic bytes before upload is registered.
 */
export function latexAssetSignatureMatches(fileName: string, bytes: Uint8Array) {
  const lower = fileName.toLowerCase();
  const rule = ASSET_RULES.find((candidate) =>
    candidate.extensions.some((extension) => lower.endsWith(extension)),
  );
  if (!rule) return false;
  if (!rule.magic) return true;
  return rule.magic.some((signature) =>
    signature.every((byte, index) => bytes[index] === byte),
  );
}
