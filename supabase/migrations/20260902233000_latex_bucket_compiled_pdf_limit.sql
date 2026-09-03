-- The latex-workspaces bucket was created with a 5 MB per-file limit sized for
-- supporting assets, but compiled PDFs share the bucket and may be up to 20 MB
-- (MAX_COMPILED_PDF_SIZE in src/lib/latex/constants.ts). Raise the bucket cap
-- so storing a valid compiled PDF is not rejected by storage. Per-asset limits
-- stay enforced by the app and the latex_document_assets size check.
update storage.buckets
set file_size_limit = 20971520
where id = 'latex-workspaces';
