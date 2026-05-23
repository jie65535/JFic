# CLAUDE.md

Guidance for Claude Code (and other AI coding assistants) working in this repository.

## What this project is

**JFic** is a pure-frontend SPA for AI-assisted fan-fiction writing. The user uploads a full original novel as a `.txt` file, the entire text is loaded into the LLM context (no chunking, no RAG, no summarization), and the user generates new chapters one by one in a reader-style interface.

- No backend. No server. No registration.
- All data (API key, novel text, generated chapters) lives in the user's browser via IndexedDB.
- All LLM calls go directly from the browser to an OpenAI-compatible endpoint (DeepSeek by default).
- See [DESIGN.md](./DESIGN.md) for the full product/design rationale. It is the source of truth for product decisions.

The UI is in Chinese. There is no i18n yet. Default to Chinese for user-facing strings; English is fine for code identifiers, comments where useful, and logs.

## Commands

```bash
npm install            # install deps
npm run dev            # vite dev server at http://localhost:5173/
npm run build          # type-check + production build into ./dist
npm run preview        # preview the production build
npm run typecheck      # tsc -b --noEmit (no build artifacts)
```

There is **no test suite** in this project yet. Do not invent test commands.

Node 22+ required (see `.nvmrc`).

## High-level architecture

```
src/
├── pages/            Route-level pages (Home, NewBook, Reader, Config, BookSettings)
├── components/
│   ├── reader/       Reader-specific: Sidebar, ChapterCard, StreamingCard, BookCover, BottomBar, TokenBar...
│   ├── book/         Bookshelf: BookCard
│   ├── ui/           Headless primitives (button, dialog, textarea, progress, drawer, switch, dropdown, tooltip)
│   └── ThemeToggle.tsx
├── hooks/            Data + side-effect hooks (useConfig, useBooks, useChapters, useGeneration, useTheme)
├── db/               Dexie instance and TypeScript types for IndexedDB tables
├── utils/            constants, messages (chat reconstruction), api (streaming), tokenEstimate, encoding,
│                     title (heading extraction), export, format, cn (Tailwind class merge)
├── App.tsx           Route table
└── main.tsx          Entry, mounts HashRouter
```

Path alias: `@/*` → `src/*`.

## Non-obvious invariants (read carefully)

These are load-bearing design decisions. Breaking them silently breaks KV-cache reuse, data integrity, or portability.

### 1. `messages` are NEVER persisted

The chat-completion `messages` array is **rebuilt purely from source data on every call**. See `src/utils/messages.ts` — `buildMessages()` and `buildMessagesForGeneration()`.

Source of truth: `book.systemPrompt` + `book.novelText` + `chapters[]` (sorted by `number`, each with `creativeIdea` + `content`).

Why: rebuilt deterministically and byte-identical to the previous call → server-side KV cache hits → much lower latency and cost. Adding any per-call randomization, timestamps, or other variation to the message stream will silently destroy cache hit rate.

### 2. Chapter title extraction relies on a prompt contract

The prompts (`src/utils/constants.ts`) enforce that every generated chapter's **first line** is `# 第N章 章节标题` (markdown H1). `src/utils/title.ts` parses that line to populate `chapter.title`, which the sidebar uses for the table of contents.

If you change the prompt format, update `extractChapterTitle()` accordingly. The function has fallbacks (truncated first line → `第 N 章`) but the sidebar quality depends on the contract holding.

### 3. Regenerating a chapter truncates everything after it

`useGeneration.generate(idea, regenerateNumber)` deletes the target chapter **and all later chapters** before regenerating. This is intentional: later chapters were written against the old content of this chapter, so they're logically invalid. The ChapterCard's "重新生成" button shows a confirmation dialog stating exactly which chapters will be deleted.

Do not relax this without a discussion. The cost is information loss; the benefit is logical consistency.

### 4. Context window is hard-capped, no fallback

`CONTEXT_HARD_LIMIT = 980_000` tokens (see `constants.ts`). When the token estimate exceeds this, generation is **rejected** with a UI prompt telling the user to export and start a new book. There is **no** automatic summarization, compression, or sliding window. This is a deliberate product decision ("力大砖飞" — see DESIGN.md §2.6).

Do not add summarization, RAG, or context shrinking.

### 5. HashRouter + `base: './'`

The app uses `HashRouter` and Vite is configured with `base: './'`. This makes the build portable to any subpath without rebuilding.

Do not switch to `BrowserRouter` (would break direct URL access on static hosts), and do not hard-code a base path in `vite.config.ts`.

### 6. Token estimate is a simple heuristic

```ts
zh_chars * 1.5 + other_chars * 0.3
```

`src/utils/tokenEstimate.ts`. This is only used for the UI progress bar and the pre-generation gate. The authoritative numbers come from the API's `usage` field after each call and are stored on each `chapter` row (`promptTokens`, `completionTokens`, `cacheHitTokens`, `cacheMissTokens`).

Don't replace the heuristic with a tokenizer library — it's intentionally cheap and runs on every keystroke worth of state change.

### 7. Streaming + abort

`src/utils/api.ts::streamChat()` uses `fetch` + `ReadableStream` + `AbortController`. Partial output is preserved if the user aborts (the chapter is written to IndexedDB with whatever content was streamed). The `usage` field arrives in the final SSE chunk when `stream_options.include_usage` is set — we already pass that.

### 8. Auto-scroll is interruption-based, not position-based

`pages/ReaderPage.tsx` tracks an "interrupted" ref. It is flipped to `true` when the user generates an input event signaling "I want to scroll up" (`wheel` with deltaY<0, `touchmove` downward, `PageUp` / `Home` / `ArrowUp`). It is flipped back to `false` when the user scrolls back near the bottom (< 30px) or a new generation starts. The auto-scroll effect respects this ref.

Do not switch back to a pure-position-based check — programmatic `scrollTo` and content growth both make naive position detection flicker.

## Style and conventions

- **Tailwind first** for styling. Use `cn()` (`@/utils/cn`) to combine class lists. Avoid styled-components or other CSS-in-JS.
- **Radix UI for primitives**, custom Tailwind components on top. Don't pull in shadcn-ui as a CLI; we hand-roll the primitives we need in `src/components/ui/`.
- **Theming**: light + dark + system, stored on `config.theme`. The `useThemeEffect()` hook in `App.tsx` applies the class to `<html>`. `color-scheme` is set in CSS to keep native UI (scrollbars, form controls) in sync.
- **No comments unless they explain *why***. Identifiers should carry semantics. Multi-paragraph docstrings and block headers are discouraged.
- **No emojis in code or UI** unless the user explicitly asks. (Some lucide icons are used; that's fine.)
- **Imports**: use `@/...` for cross-folder, relative `./` for same-folder.
- **Functions vs components**: function declarations for components and module-level helpers; arrow functions inline.
- **Don't add dependencies** without first checking whether an existing primitive can do the job. Bundle size matters (~640 KB JS / 207 KB gzip currently — markdown parser is the bulk).
- **No new abstractions ahead of demand**. Three similar lines is fine. Wait for a 4th.

## Working with IndexedDB / Dexie

- All schema lives in `src/db/index.ts`. Indexed fields appear in `.stores(...)`; non-indexed fields can be added to the TypeScript type freely without a migration.
- Use `useLiveQuery` from `dexie-react-hooks` for reactive reads — see `useBooks`, `useChapters`, `useConfig` for the patterns.
- **Important**: `useLiveQuery(() => db.foo.get(key))` returns `undefined` both while loading **and** when no row exists. Coalesce to `null` inside the query if you need to distinguish them (see `useConfig` for the pattern).

## Adding a new feature: where to put it

- **New page**: `src/pages/` + route in `App.tsx`.
- **Reader sub-feature** (e.g. annotations, find-in-page): `src/components/reader/` and wire into `ReaderPage.tsx`.
- **Generation behavior** (e.g. different sampling, new role messages): `useGeneration` and `utils/messages.ts` (be mindful of cache invariant #1).
- **Persistent state**: add to `db/types.ts`, optionally index in `db/index.ts`, write a small CRUD helper in `hooks/`.

## Common pitfalls

- **Forgetting `creativeIdea` is part of cache invariant**: if you change the user-message templates (`buildFirstChapterUserMessage` / `buildNextChapterUserMessage`), every existing book's cache will be invalidated for the affected chapter onwards. Discuss before changing.
- **Adding `temperature` / `top_p` to API calls**: if randomized per-call, this won't affect cache (server doesn't include sampling params in cache key), but if read from user settings and changed mid-book it doesn't break anything either. We currently default temperature inside `streamChat`.
- **Manipulating `chapter.content` after stream completes** (e.g. trimming, normalizing whitespace): doing this *after* `addChapter` is fine. Doing it as a one-time migration changes the stored bytes which means the next generation builds messages with new bytes → cache miss.
- **Persisting partial streaming content during a refresh**: not currently done. If you implement it, treat it as a draft that doesn't enter `messages` reconstruction until generation completes — otherwise cache breaks.
- **Adding new env-dependent paths**: don't. The project deploys to any subpath via relative URLs + HashRouter. Don't reintroduce `import.meta.env.BASE_URL` concatenations.

## Reference

- [DESIGN.md](./DESIGN.md) — full product design doc (Chinese). Source of truth for product decisions and rationale.
- [README.md](./README.md) — user-facing intro (Chinese).
- DeepSeek API docs (the default OpenAI-compatible endpoint): `https://api.deepseek.com`
