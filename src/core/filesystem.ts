import { DirectoryNode, FileNode, FsNode } from './nodes';
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
    if (node.kind !== 'directory') {
      throw new NotADirectoryError(`Not a directory: ${path}`);
    }
    this.cwd = node as DirectoryNode;
  }

  // --- internal helpers -------------------------------------------------

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
        node = node.parent ?? node; // '..' at root stays at root
        continue;
      }
      if (node.kind !== 'directory') {
        throw new NotADirectoryError(`Not a directory: ${path}`);
      }
      const next = (node as DirectoryNode).children.get(seg);
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
      if (next.kind !== 'directory') {
        throw new NotADirectoryError(`Not a directory: ${seg}`);
      }
      node = next as DirectoryNode;
    }
    return { parent: node, name: leaf };
  }
}
