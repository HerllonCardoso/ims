# Agent Notes

## Project

This is a TypeScript in-memory filesystem organized as an npm workspace. The core
filesystem library is shared by a CLI, a Fastify HTTP server, and a React/Vite web
explorer. Public usage and API details are in `README.md`; web UI design notes are
in `DESIGN.md`.

## Commands

- Install dependencies: `npm install`
- Run all tests: `npm test`
- Run backend Jest tests in band: `npx jest --runInBand`
- Run client tests: `npm run test -w @ims/client`
- Type-check: `npm run typecheck`
- Build: `npm run build`
- Lint: `npm run lint`
- Format check: `npm run format:check`
- Run the CLI REPL: `npm start`
- Run server and client dev servers: `npm run dev`

## Layout

- `packages/core/` contains the pure framework-agnostic filesystem library.
- `packages/core/src/filesystem.ts` exposes the `FileSystem` facade and owns path
  resolution, mutation, walking, find, move, copy, remove, and permission behavior.
- `packages/core/src/path.ts` is the pure path parser; share it instead of parsing
  paths ad hoc.
- `packages/core/src/nodes.ts` defines filesystem node types and type guards.
- `packages/core/src/conflicts.ts` contains move/copy conflict helpers.
- `packages/core/src/errors.ts` defines the filesystem error taxonomy.
- `packages/core/src/permissions.ts` contains the ACL model.
- `packages/cli/` is a thin REPL and command parser over `@ims/core`.
- `packages/shared/` contains HTTP wire-format types shared by server and client.
- `packages/server/` wraps a singleton `FileSystem` behind Fastify routes.
- `packages/client/` is the React/Vite web explorer.

## Conventions

- Keep `packages/core` independent of CLI, server, Node IO, HTTP, and browser
  concerns.
- Preserve strict TypeScript settings; avoid `as` casts when an existing type
  guard can narrow the type.
- Use the custom `FileSystemError` subclasses for expected filesystem failures so
  the CLI and server can produce clean errors.
- `ls()` returns sorted child names. `walk()` is pre-order and intentionally uses
  insertion order.
- Move/copy directory merges should remain all-or-nothing: preflight validation
  should happen before mutating tree state.
- Keep server routes thin: validate request shape, call `FileSystem`, return
  shared response types, and map filesystem errors through the existing error
  helpers.
- Keep the client driven by server truth; refetch after mutations instead of
  duplicating filesystem state locally.
- Follow the existing Tailwind/shadcn/Radix/lucide patterns in `packages/client`.
- Do not edit generated or dependency directories such as `dist/`, `coverage/`,
  or `node_modules/`.

## Testing

- Add or update focused tests for behavior changes, especially path resolution,
  error cases, permissions, move/copy conflict policy, CLI parsing, server routes,
  and client interactions.
- Backend suites use Jest under `packages/core`, `packages/cli`, and
  `packages/server`.
- Client suites use Vitest under `packages/client`.
- Run `npm test` and `npm run typecheck` before claiming the repo is in a passing
  state.
