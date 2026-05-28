import { DirectoryNode, FileNode, FsNode, isDirectory, isFile } from './nodes';
import { parsePath } from './path';

export type WalkVisitor = (node: FsNode, path: string) => boolean | void;
import {
  AlreadyExistsError,
  DirectoryNotEmptyError,
  InvalidOperationError,
  InvalidPathError,
  NotADirectoryError,
  NotAFileError,
  NotFoundError,
} from './errors';

export class FileSystem {
  private readonly root: DirectoryNode;
  private cwd: DirectoryNode;

  constructor() {
    this.root = new DirectoryNode('', null);
    this.cwd = this.root;
  }

  pwd(): string {
    return this.pathOf(this.cwd);
  }

  cd(path: string): void {
    const node = this.resolveNode(path);
    if (!isDirectory(node)) {
      throw new NotADirectoryError(`Not a directory: ${path}`);
    }
    this.cwd = node;
  }

  mkdir(path: string, opts: { recursive?: boolean } = {}): DirectoryNode {
    const { parent, name } = this.resolveParent(path, opts);
    const existing = parent.children.get(name);
    if (existing) {
      if (opts.recursive && isDirectory(existing)) {
        return existing;
      }
      throw new AlreadyExistsError(`Already exists: ${name}`);
    }
    const dir = new DirectoryNode(name, parent);
    parent.children.set(name, dir);
    return dir;
  }

  ls(path?: string): string[] {
    const node = path === undefined ? this.cwd : this.resolveNode(path);
    if (!isDirectory(node)) {
      throw new NotADirectoryError(`Not a directory: ${path ?? this.pwd()}`);
    }
    return [...node.children.keys()].sort();
  }

  rmdir(path: string, opts: { recursive?: boolean } = {}): void {
    const node = this.resolveNode(path);
    if (!isDirectory(node)) {
      throw new NotADirectoryError(`Not a directory: ${path}`);
    }
    if (node === this.root) {
      throw new InvalidOperationError('Cannot remove the root directory');
    }
    if (node.children.size > 0 && !opts.recursive) {
      throw new DirectoryNotEmptyError(`Directory not empty: ${path}`);
    }
    if (this.isAncestorOrSelf(node, this.cwd)) {
      // node.parent is guaranteed non-null here: root has been rejected above.
      this.cwd = node.parent!;
    }
    node.parent!.children.delete(node.name);
    node.parent = null;
  }

  createFile(path: string): FileNode {
    const { parent, name } = this.resolveParent(path);
    if (parent.children.has(name)) {
      throw new AlreadyExistsError(`Already exists: ${name}`);
    }
    const file = new FileNode(name, parent);
    parent.children.set(name, file);
    return file;
  }

  writeFile(path: string, content: string): void {
    this.resolveFile(path).content = content;
  }

  readFile(path: string): string {
    return this.resolveFile(path).content;
  }

  /**
   * Part 1 / simple form: rename or relocate a node to a new path in the SAME or
   * a different directory. Task 11 extends this with merge + collision policy.
   */
  move(src: string, dest: string): void {
    const node = this.resolveNode(src);
    if (node.parent === null) {
      throw new InvalidOperationError('Cannot move the root directory');
    }
    const { parent: destParent, name: destName } = this.resolveParent(dest);
    if (destParent.children.has(destName)) {
      throw new AlreadyExistsError(`Already exists: ${destName}`);
    }
    if (isDirectory(node) && this.isAncestorOrSelf(node, destParent)) {
      throw new InvalidOperationError('Cannot move a directory into itself');
    }
    node.parent.children.delete(node.name);
    node.name = destName;
    node.parent = destParent;
    destParent.children.set(destName, node);
  }

  /**
   * Pre-order walk over the subtree at `path`. The visitor may return `false` from a
   * directory node to skip recursion into its children.
   */
  walk(path: string, visit: WalkVisitor): void {
    const start = this.resolveNode(path);
    const recurse = (node: FsNode): void => {
      const decision = visit(node, this.pathOf(node));
      if (isDirectory(node) && decision !== false) {
        for (const child of node.children.values()) {
          recurse(child);
        }
      }
    };
    recurse(start);
  }

  /** Returns the absolute path of the first node whose name matches the pattern. */
  findFirst(pattern: RegExp, startPath?: string): string | null {
    let hit: string | null = null;
    this.walk(startPath ?? this.pwd(), (node, p) => {
      if (hit !== null) return false; // early exit: skip remaining recursion
      if (node !== this.root && pattern.test(node.name)) {
        hit = p;
        return false;
      }
    });
    return hit;
  }

  find(name: string, startPath?: string): string[] {
    const start = startPath === undefined ? this.cwd : this.resolveNode(startPath);
    const matches: string[] = [];
    const visit = (node: FsNode): void => {
      if (node.name === name && node !== this.root) {
        matches.push(this.pathOf(node));
      }
      if (isDirectory(node)) {
        for (const child of node.children.values()) {
          visit(child);
        }
      }
    };
    visit(start);
    return matches;
  }

  // --- internal helpers -------------------------------------------------

  private resolveFile(path: string): FileNode {
    const node = this.resolveNode(path);
    if (!isFile(node)) {
      throw new NotAFileError(`Not a file: ${path}`);
    }
    return node;
  }

  private startNode(absolute: boolean): DirectoryNode {
    return absolute ? this.root : this.cwd;
  }

  private pathOf(node: FsNode): string {
    if (node.parent === null) return '/';
    const parts: string[] = [];
    let n: FsNode = node;
    while (n.parent !== null) {
      parts.unshift(n.name);
      n = n.parent;
    }
    return '/' + parts.join('/');
  }

  /** Resolve a path to an existing node. Throws if any component is missing. */
  protected resolveNode(path: string): FsNode {
    const { absolute, segments } = parsePath(path);
    let node: FsNode = this.startNode(absolute);
    for (const seg of segments) {
      if (seg === '..') {
        if (!isDirectory(node)) {
          throw new NotADirectoryError(`Not a directory: ${path}`);
        }
        node = node.parent ?? node; // '..' at root stays at root
        continue;
      }
      if (!isDirectory(node)) {
        throw new NotADirectoryError(`Not a directory: ${path}`);
      }
      const next = node.children.get(seg);
      if (!next) throw new NotFoundError(`No such file or directory: ${path}`);
      node = next;
    }
    return node;
  }

  /**
   * Resolve to (containing directory, leaf name). Used by create/move/copy.
   * With { recursive: true } any missing intermediate directories are created.
   */
  protected resolveParent(
    path: string,
    opts: { recursive?: boolean } = {},
  ): { parent: DirectoryNode; name: string } {
    const { absolute, segments } = parsePath(path);
    if (segments.length === 0) {
      throw new InvalidOperationError(`Cannot operate on root: ${path}`);
    }
    const leaf = segments[segments.length - 1];
    if (leaf === '..') {
      throw new InvalidPathError(`Invalid trailing path segment: ${path}`);
    }
    let node: DirectoryNode = this.startNode(absolute);
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (seg === '..') {
        node = node.parent ?? node;
        continue;
      }
      let next = node.children.get(seg);
      if (!next) {
        if (!opts.recursive) {
          throw new NotFoundError(`No such file or directory: ${seg}`);
        }
        const created = new DirectoryNode(seg, node);
        node.children.set(seg, created);
        next = created;
      }
      if (!isDirectory(next)) {
        throw new NotADirectoryError(`Not a directory: ${seg}`);
      }
      node = next;
    }
    return { parent: node, name: leaf };
  }

  private isAncestorOrSelf(ancestor: DirectoryNode, candidate: FsNode): boolean {
    let n: FsNode | null = candidate;
    while (n !== null) {
      if (n === ancestor) return true;
      n = n.parent;
    }
    return false;
  }
}
