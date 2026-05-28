# In-Memory Filesystem

A small in-memory filesystem in TypeScript with an interactive CLI. Implements the core
directory and file commands plus three extensions: path operations (absolute
and relative paths, `..`, auto-creating intermediates), subtree walking with a pruning
visitor, and move/copy with directory merge and a collision policy.

## Requirements

- Node ≥ 20
- npm

## Quick start

    npm install
    npm test         # run the Jest suite
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

Type `help` inside the REPL for the full command list.

## Library API

    import { FileSystem } from './src/core';

    const fs = new FileSystem();
    fs.mkdir('school');
    fs.cd('school');
    fs.createFile('notes.txt');
    fs.writeFile('notes.txt', 'hello');
    console.log(fs.readFile('notes.txt')); // "hello"

Public methods on `FileSystem`:

| Method | Notes |
|---|---|
| `pwd()` | current working directory |
| `cd(path)` | absolute, relative, `..` supported |
| `mkdir(path, { recursive? })` | `recursive` creates intermediate directories |
| `ls(path?)` | sorted child names |
| `rmdir(path, { recursive? })` | empty by default; `recursive` removes subtree |
| `createFile(path)` | empty file |
| `writeFile(path, content)` | overwrites |
| `readFile(path)` | returns string content |
| `move(src, dest, { onConflict? })` | merges directories; policy `error` / `overwrite` / `rename` |
| `copy(src, dest, { onConflict? })` | deep clone; same merge + policy rules |
| `find(name, startPath?)` | every match by exact name in the subtree |
| `walk(path, visit)` | pre-order; visitor returning `false` prunes a subtree |
| `findFirst(regex, startPath?)` | first match by regex |

Errors are subclasses of `FileSystemError`: `InvalidPathError`, `NotFoundError`,
`NotADirectoryError`, `NotAFileError`, `AlreadyExistsError`,
`DirectoryNotEmptyError`, `InvalidOperationError`.

## Design notes

- A `DirectoryNode` holds children in a `Map<string, FsNode>` — O(1) child lookup,
  insert, delete by name.
- Each node has a parent pointer, so `move` is O(1) (no descendant paths to rewrite)
  and `pwd` is O(depth).
- Path parsing is a small pure module; every command shares the same resolver, so the
  path-operations extension was a natural foundation rather than a bolt-on.
- Move/copy share one core routine (`placeInto`) parameterised by move-vs-copy and
  conflict policy.
- Type guards (`isFile`, `isDirectory`) replace `as` casts throughout the codebase for
  safer narrowing.

## Out of scope (and what would change)

- **Browser file explorer** — would wrap a singleton `FileSystem` behind HTTP route
  handlers; the library itself wouldn't change.
- **Symlinks / hardlinks** — would require splitting nodes into inodes + directory
  entries (multiple names referencing one inode). The current node-tree model is
  intentional because it gives the best scalability for the operations actually in
  scope.
- **Permissions / users** — would attach an owner + mode to each node and check on
  every operation.
- **Streaming** — would change `readFile`/`writeFile` to return/accept Node streams
  and require keeping reader/writer handles valid across moves.
- **Binary content** — swap `string` for `Uint8Array`; the API shape doesn't change.

## Project layout

    src/
      core/         pure, framework-agnostic filesystem library
        nodes.ts    FsNode / FileNode / DirectoryNode + type guards
        errors.ts   FileSystemError taxonomy
        path.ts     pure path parser
        conflicts.ts ConflictPolicy + clone/rename helpers
        filesystem.ts FileSystem facade — the public API
        index.ts    barrel
      cli/          thin REPL on top of the core
        commands.ts parse a line -> FileSystem call
        repl.ts     readline loop
        index.ts    bin entry
    tests/          Jest test suites (one file per concern)

## Tests

82 tests across 7 files cover every public method, edge cases, error paths, and the
worked example.
