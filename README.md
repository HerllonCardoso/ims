# In-Memory Filesystem

A small in-memory filesystem in TypeScript with an interactive CLI. Implements the core
directory and file commands plus four extensions: path operations (absolute and
relative paths, `..`, auto-creating intermediates), subtree walking with a pruning
visitor, move/copy with directory merge and a collision policy, and read/write
permissions for users and groups.

## Requirements

- Node ≥ 20
- npm

## Quick start

    npm install
    npm test         # run the Jest suite
    npm run coverage # run Jest with coverage
    npm run lint     # run ESLint
    npm run format:check
    npm start        # launch the interactive REPL

## REPL example

    /$ mkdir school
    /$ cd school
    /school$ mkdir homework
    /school$ cd homework
    /school/homework$ mkdir math
    /school/homework$ mkdir history
    /school/homework$ ls
    history  math
    /school/homework$ cd ..
    /school$ mkdir cheatsheet
    /school$ ls
    cheatsheet  homework
    /school$ cd ..
    /$ pwd
    /

Type `help` inside the REPL for the full command list. Press `Tab` to complete
command names and path arguments (directory matches get a trailing `/`).

## Library API

    import { FileSystem } from './src/core';

    const fs = new FileSystem();
    fs.mkdir('school');
    fs.cd('school');
    fs.createFile('notes.txt');
    fs.writeFile('notes.txt', 'hello');
    console.log(fs.readFile('notes.txt')); // "hello"

Public methods on `FileSystem`:

| Method                                         | Notes                                                                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pwd()`                                        | current working directory                                                                                  |
| `cd(path)`                                     | absolute, relative, `..` supported                                                                         |
| `mkdir(path, { recursive? })`                  | `recursive` creates intermediate directories                                                               |
| `ls(path?)`                                    | sorted child names                                                                                         |
| `rmdir(path, { recursive? })`                  | empty by default; `recursive` removes subtree                                                              |
| `createFile(path, { recursive? })`             | empty file; `recursive` creates intermediate directories                                                   |
| `writeFile(path, content)`                     | overwrites                                                                                                 |
| `readFile(path)`                               | returns string content                                                                                     |
| `move(src, dest, { onConflict?, recursive? })` | merges directories; policy `error` / `overwrite` / `rename`; `recursive` creates destination intermediates |
| `copy(src, dest, { onConflict?, recursive? })` | deep clone; same merge + policy rules                                                                      |
| `find(name, startPath?)`                       | every match by exact name in the subtree                                                                   |
| `walk(path, visit)`                            | pre-order; visitor returning `false` prunes a subtree                                                      |
| `findFirst(regex, startPath?)`                 | first match by regex                                                                                       |
| `createUser(name)`                             | create a user; root-only                                                                                   |
| `createGroup(name)`                            | create a group; root-only                                                                                  |
| `addUserToGroup(user, group)`                  | group membership; root-only                                                                                |
| `switchUser(name)`                             | switch current user for testing                                                                            |
| `currentUser()`                                | current user name                                                                                          |
| `grantUser(path, user, permissions)`           | grant `{ read?, write? }` on a node; root-only                                                             |
| `grantGroup(path, group, permissions)`         | grant `{ read?, write? }` on a node; root-only                                                             |
| `revokeUser(path, user)`                       | remove a user grant; root-only                                                                             |
| `revokeGroup(path, group)`                     | remove a group grant; root-only                                                                            |

The CLI mirrors these options with flags: `-p` on `touch`, `mv`, and `cp` auto-creates
intermediate destination directories.

Permissions use a deliberately small ACL model: `root` can do everything, users can be
members of groups, and user/group grants are additive. `read` is required to list,
traverse with `walk`/`find`, or read files. `write` is required to write files and to
create, delete, move, or copy children in a directory. New nodes created by a non-root
user grant that user read/write access.

The CLI exposes this as:

    useradd alice
    groupadd engineering
    usermod -aG engineering alice
    grant group engineering r /shared
    grant user alice rw /workspace
    revoke user alice /workspace
    su alice
    whoami

Errors are subclasses of `FileSystemError`: `InvalidPathError`, `NotFoundError`,
`NotADirectoryError`, `NotAFileError`, `AlreadyExistsError`,
`DirectoryNotEmptyError`, `InvalidOperationError`, `PermissionDeniedError`,
`UserNotFoundError`, `GroupNotFoundError`.

## Complexity

Where `d` is the number of path segments resolved, `k` is the children of the target
directory, and `n` is the number of nodes in the source / walked subtree. All child
lookups are O(1) (`Map<string, FsNode>`), and every node has a parent pointer.

| Method                                  | Complexity                                 | Why                                             |
| --------------------------------------- | ------------------------------------------ | ----------------------------------------------- |
| `pwd()`                                 | O(d)                                       | walks parent pointers from cwd to root          |
| `cd(path)`                              | O(d)                                       | one Map lookup per segment                      |
| `mkdir(path, …)`                        | O(d)                                       | resolve parent + single insert                  |
| `ls(path?)`                             | O(d + k log k)                             | resolve + sort children                         |
| `rmdir(path, …)`                        | O(d)                                       | single Map delete; subtree is detached and GC'd |
| `createFile(path, …)`                   | O(d)                                       | resolve parent + single insert                  |
| `writeFile(path, content)`              | O(d)                                       | content is stored by reference                  |
| `readFile(path)`                        | O(d)                                       | returns the stored string                       |
| `move(src, dest, …)` rename / cross-dir | O(d)                                       | pointer reassignment, no descendant rewrite     |
| `move(src, dest, …)` with merge         | O(d + n)                                   | preflight + apply over the merged subtree       |
| `copy(src, dest, …)`                    | O(d + n)                                   | deep clone of the source subtree                |
| `find(name, …)`                         | O(d + n)                                   | pre-order walk, no early exit                   |
| `findFirst(regex, …)`                   | O(d + n) worst, O(d + depth-of-match) best | pre-order walk, throws to halt on first hit     |
| `walk(path, visit)`                     | O(d + n)                                   | pre-order; visitor can prune to reduce `n`      |

## Concurrency

The Node.js event loop is single-threaded, so every `FileSystem` method completes
without interleaving and is atomic from a caller's perspective — no locking is needed
or provided. Two consequences worth noting:

- Move/copy do a recursive preflight (`assertCanPlaceInto`) before any mutation, so a
  partial merge can't be observed even mid-throw. Combined with the synchronous event
  loop, the tree never ends up in a half-applied state.
- If this library were embedded in a multi-writer host (worker threads, a cluster of
  processes sharing the tree, or a server with concurrent requests against one
  `FileSystem` instance), it would need either an external mutex around mutating calls
  or a redesign around an append-only log / per-node lock. The current node-tree model
  assumes one writer at a time.

## Design notes

- A `DirectoryNode` holds children in a `Map<string, FsNode>` — O(1) child lookup,
  insert, delete by name.
- Each node has a parent pointer, so `move` is O(1) (no descendant paths to rewrite)
  and `pwd` is O(depth).
- Path parsing is a small pure module; every command shares the same resolver, so the
  path-operations extension was a natural foundation rather than a bolt-on.
- Move/copy share one core routine (`placeInto`) parameterised by move-vs-copy and
  conflict policy.
- Move/copy preflight recursive merges before mutating the tree, so failed operations
  do not leave partially moved or copied children behind.
- Permission checks are centralized in the core facade. The node model stores ACLs, but
  path parsing, CLI parsing, and traversal code do not duplicate permission logic.
- Type guards (`isFile`, `isDirectory`) replace `as` casts throughout the codebase for
  safer narrowing.

## Web explorer

A browser UI sits over the same in-memory `FileSystem`. The library is unchanged; the server wraps a singleton instance behind HTTP routes, and the client renders server truth.

    npm install            # one install, all workspaces
    npm run dev            # Fastify on :3000, Vite on :5173, open :5173
    npm run build && npm run serve   # single-process production on :3000

The filesystem is in-memory: restarting the server resets it.

### Layout

- `packages/core/` — the existing pure library (`@ims/core`), plus `FileSystem.remove(path, opts?)`.
- `packages/cli/` — the existing REPL (`@ims/cli`); `npm start` still works.
- `packages/shared/` — wire-format types shared by server and client.
- `packages/server/` — Fastify routes that wrap the singleton FileSystem and map `FileSystemError` subclasses to HTTP status codes.
- `packages/client/` — React + Vite SPA, Tailwind + shadcn primitives, Spotify-derived dark theme. Holds only UI state; re-fetches after every mutation.

### HTTP API summary

| Method | Path | Maps to |
|---|---|---|
| GET | `/api/entries?path=…` | `ls` |
| GET | `/api/entries/stat?path=…` | resolve node |
| POST | `/api/dirs` | `mkdir` |
| POST | `/api/files` | `createFile` |
| GET/PUT | `/api/files/content` | `readFile` / `writeFile` |
| DELETE | `/api/entries?path=…&recursive=…` | `remove` |
| POST | `/api/move` | `move` |
| POST | `/api/copy` | `copy` |
| GET | `/api/find?name=…` | `find` |
| GET | `/api/find/first?pattern=…` | `findFirst` |
| GET | `/api/tree?path=…&depth=…` | bounded `walk` |

## Out of scope (and what would change)

- **Browser file explorer** — now implemented; see the "Web explorer" section above.
- **Symlinks / hardlinks** — would require splitting nodes into inodes + directory
  entries (multiple names referencing one inode). The current node-tree model is
  intentional because it gives the best scalability for the operations actually in
  scope.
- **Streaming** — would change `readFile`/`writeFile` to return/accept Node streams
  and require keeping reader/writer handles valid across moves.
- **Binary content** — swap `string` for `Uint8Array`; the API shape doesn't change.

## Project layout

    packages/
      core/     pure, framework-agnostic filesystem library (@ims/core)
      cli/      thin REPL on top of the core (@ims/cli)
      shared/   HTTP wire-format types (@ims/shared)
      server/   Fastify HTTP wrapper + static serving (@ims/server)
      client/   React + Vite SPA (@ims/client)

## Tests

127 tests across 11 files cover every public method, edge cases, error paths, and the
worked example.

Run coverage locally with:

    npm run coverage

Current coverage snapshot:

| Area             | Statements | Branches | Functions | Lines  |
| ---------------- | ---------- | -------- | --------- | ------ |
| All files        | 84.11%     | 75.10%   | 86.20%    | 85.95% |
| Core             | 91.49%     | 79.48%   | 95.16%    | 92.91% |
| `filesystem.ts`  | 91.71%     | 80.29%   | 97.95%    | 92.64% |
| `permissions.ts` | 100%       | 75.00%   | 100%      | 100%   |

The lower total coverage is from the interactive REPL entrypoints
(`src/cli/index.ts` and `src/cli/repl.ts`), which are thin wrappers around the tested
command dispatcher and core library.
