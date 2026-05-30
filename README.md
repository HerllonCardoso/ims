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
    npm test         # run the Jest + Vitest suites
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

    import { FileSystem } from '@ims/core';

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

| Method  | Path                              | Maps to                  |
| ------- | --------------------------------- | ------------------------ |
| GET     | `/api/entries?path=…`             | `ls`                     |
| GET     | `/api/entries/stat?path=…`        | resolve node             |
| POST    | `/api/dirs`                       | `mkdir`                  |
| POST    | `/api/files`                      | `createFile`             |
| GET/PUT | `/api/files/content`              | `readFile` / `writeFile` |
| DELETE  | `/api/entries?path=…&recursive=…` | `remove`                 |
| POST    | `/api/move`                       | `move`                   |
| POST    | `/api/copy`                       | `copy`                   |
| GET     | `/api/find?name=…`                | `find`                   |
| GET     | `/api/find/first?pattern=…`       | `findFirst`              |
| GET     | `/api/tree?path=…&depth=…`        | bounded `walk`           |

## Project layout

    packages/
      core/     pure, framework-agnostic filesystem library (@ims/core)
      cli/      thin REPL on top of the core (@ims/cli)
      shared/   HTTP wire-format types (@ims/shared)
      server/   Fastify HTTP wrapper + static serving (@ims/server)
      client/   React + Vite SPA (@ims/client)

## Tests

230 tests across 32 files cover every public method, edge cases, error paths, the
worked example, the HTTP routes, and the client dialogs. Backend
suites run under Jest (`packages/core`, `packages/cli`, `packages/server`); the client
runs under Vitest (`packages/client`). `npm test` runs both.
