/**
 * A stored PDF is only package-ready when it was produced from the current
 * source revision. Source or asset writes bump `rowVersion` and leave the
 * compiled pointer behind until the next successful upload.
 */
export function isCompiledOutputFresh(input: {
  compiledRowVersion: number | null | undefined;
  rowVersion: number;
}) {
  return (
    input.compiledRowVersion !== null &&
    input.compiledRowVersion !== undefined &&
    input.compiledRowVersion === input.rowVersion
  );
}
