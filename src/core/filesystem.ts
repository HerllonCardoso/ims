import { DirectoryNode, FileNode, FsNode, isDirectory, isFile } from './nodes';
import { parsePath } from './path';
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
