<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Verification

- `npx tsc --noEmit -p .` — typecheck
- `npx eslint src` — lint
- `npm test` — unit tests (`src/lib/**/*.test.ts`)
- Every Gemini call must first claim a per-user quota through `beginAiOperation` (`src/lib/ai/usage.ts`); new AI actions need a row in `private.ai_action_limits` and the `ai_usage_events`/`ai_audit_events` action checks.
