import JSZip from "jszip";

import { safeLatexAssetName } from "@/lib/latex/asset-policy";

export type LatexProjectInput = {
  title: string;
  source: string;
  assets: Array<{ fileName: string; bytes: ArrayBuffer }>;
};

export function latexProjectFileName(title: string) {
  const base = safeLatexAssetName(title).replace(/\.[^.]*$/, "");
  return `${base || "latex-project"}.zip`;
}

/**
 * The archive mirrors what the compiler sees: `main.tex` at the root plus every
 * supporting asset beside it, so an extracted project builds without edits.
 */
export async function buildLatexProjectArchive(project: LatexProjectInput) {
  const zip = new JSZip();
  zip.file("main.tex", project.source);
  for (const asset of project.assets) {
    zip.file(safeLatexAssetName(asset.fileName), asset.bytes);
  }
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
