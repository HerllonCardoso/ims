# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

npm workspaces monorepo (`packages/*`). Run from the repo root unless noted.

- `npm install` — installs all workspaces at once
- `npm test` — backend Jest suites + client Vitest (`jest && npm run test -w @ims/client`)
- `npx jest --runInBand` — backend suites only (root `jest.config.ts` aggregates the `core`, `cli`, `server` projects)
- `npx jest packages/core/tests/filesystem.move-copy.test.ts` — single backend test file
- `npx jest -t "merges directories"` — backend tests matching a name
- `npm run test -w @ims/client` — client (Vitest) only; `vitest` for watch from `packages/client`
- `npm run typecheck` — `tsc -b --pretty` across all project references
- `npm run build` — `tsc -b` (all packages) then `vite build` for the client
- `npm run lint` / `npm run lint:fix` — ESLint over the repo
- `npm run format:check` / `npm run format` — Prettier
- `npm start` — CLI REPL (`@ims/cli`, `ts-node`)
- `npm run dev` — Fastify on :3000 + Vite on :5173 (open :5173; Vite proxies `/api` → :3000)
- `npm run build && npm run serve` — single-process production server on :3000

Builds use TypeScript **project references** (`composite: true` in `tsconfig.base.json`); each package has its own `tsconfig.json` and the root `tsconfig.json` references them. Use `tsc -b`, not `tsc` — a plain `tsc` won't respect the reference graph.

## Architecture

Five workspaces, one shared in-memory filesystem. Dependency direction: `core` is the root; `cli` and `server` consume `core`; `shared` (wire types) is consumed by `server` and `client`; `client` talks to `server` over HTTP. Keep this DAG — `core` must never import from CLI, server, HTTP, Node IO, or browser code.

- `packages/core/` (`@ims/core`) — pure, framework-agnostic filesystem library. Public surface is the `FileSystem` class re-exported from `src/index.ts`.
- `packages/cli/` (`@ims/cli`) — REPL over the core. `commands.ts` parses a line into a `FileSystem` call; `completion.ts` is tab completion; `repl.ts` runs the readline loop; `index.ts` is the bin.
- `packages/shared/` (`@ims/shared`) — HTTP wire-format request/response types (`api.ts`). The single source of truth shared by server and client; change a payload shape here, not in two places.
- `packages/server/` (`@ims/server`) — Fastify wrapper around a **singleton** `FileSystem`. `app.ts` builds the app and registers `routes/*`; one error handler (`errors.ts`) maps `FileSystemError` subclasses to HTTP status codes. In-memory: restarting resets state.
- `packages/client/` (`@ims/client`) — React + Vite SPA (Tailwind + shadcn/Radix/lucide). UI design notes live in `DESIGN.md`.

### Core invariants worth knowing before editing

These span multiple files in `packages/core/src/` and are easy to break unintentionally:

- **Node model (`nodes.ts`)**: every `FsNode` carries a `parent` pointer; directories hold children in a `Map<string, FsNode>`. This makes `move` O(1) (no descendant paths to rewrite) and `pwd` O(depth). Use the `isFile` / `isDirectory` type guards rather than `as` casts.
- **Path parsing (`path.ts`)**: a single pure parser splits on `/`, strips empty and `.` segments, **preserves `..`**. `..` is resolved by the caller (`resolveNode` / `resolveParent` in `filesystem.ts`) so they can throw `NotADirectoryError` when traversing through a file. Do not collapse `..` in `parsePath`.
- **Move/copy share `placeInto` (`filesystem.ts`, helpers in `conflicts.ts`)**: parameterised by `isMove` and `ConflictPolicy`. Two non-obvious rules:
  1. Dir-vs-dir same-name collision **always merges recursively**, regardless of policy. The `error`/`overwrite`/`rename` policy only applies to file-vs-file or non-dir-vs-dir collisions found during the merge (mirrors `cp -r` / `mv`).
  2. Mutations are all-or-nothing. `move`/`copy` preflight the entire recursive merge **before** any tree changes, and `resolveParent({recursive: true})` records each intermediate dir it creates so it can be rolled back if anything later throws.
- **CWD safety**: `rmdir` and the move-merge path both check ancestry against `this.cwd` and reparent `cwd` to the source's parent before detaching, so the REPL never ends up "in" a deleted subtree.
- **Permissions (`permissions.ts`)**: small additive ACL. `root` does everything; `read` is needed to list/walk/find/read; `write` to write files and to create/delete/move/copy children. New nodes created by a non-root user grant that user read/write. Mutating ops are root-only.
- **Error taxonomy (`errors.ts`)**: throw the specific `FileSystemError` subclass (`NotFoundError`, `NotADirectoryError`, `AlreadyExistsError`, `InvalidOperationError`, `PermissionDeniedError`, …). The CLI prints `${err.name}: ${err.message}`, the server maps `err.name` → HTTP status, and tests assert on the class — so the subclass name is load-bearing in three places.
- **Conflict policy mapping (CLI)**: `-f` → `overwrite`, `-n` → `rename`, default → `error`. `-p` on `mkdir`/`touch`/`mv`/`cp` sets `recursive: true` (auto-create intermediate destination directories).

### Server / client contract

- **Server routes stay thin**: validate request shape, call the `FileSystem`, return a `@ims/shared` type, and let the central error handler translate failures. Don't catch and re-encode `FileSystemError` inside a route.
- **Client is server-truth**: it holds only UI state and **re-fetches after every mutation** rather than mirroring the tree locally. `useApi(fetcher, deps, revision)` re-runs when `revision` bumps — bump the revision to invalidate, don't patch cached data by hand.
- The `vite build` output goes to `packages/server/dist/public`; the server serves it statically and falls back to `index.html` for non-`/api` routes (SPA routing).

### Tests

One file per concern: backend under each package's `tests/` (e.g. `packages/core/tests/filesystem.move-copy.test.ts`), client co-located as `*.test.ts(x)` under `packages/client/src`. Add cases to the matching file rather than creating a new one. Backend = Jest, client = Vitest.
