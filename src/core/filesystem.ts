import { DirectoryNode, FileNode, FsNode, isDirectory, isFile } from './nodes';
import { parsePath } from './path';
import { ConflictPolicy, cloneNodeTree, nextFreeName } from './conflicts';
import {
  AlreadyExistsError,
  DirectoryNotEmptyError,
  InvalidOperationError,
  InvalidPathError,
  NotADirectoryError,
  NotAFileError,
  NotFoundError,
} from './errors';

export type WalkVisitor = (node: FsNode, path: string) => boolean | void;

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

  move(
    src: string,
    dest: string,
    opts: { onConflict?: ConflictPolicy } = {},
  ): void {
    const source = this.resolveNode(src);
    if (source.parent === null) {
      throw new InvalidOperationError('Cannot move the root directory');
    }
    const { destParent, destName } = this.resolveDestination(dest, source.name);
    if (source === destParent.children.get(destName)) return; // no-op
    if (
      isDirectory(source) &&
      this.isAncestorOrSelf(source, destParent)
    ) {
      throw new InvalidOperationError('Cannot move a directory into itself');
    }
    this.placeInto(destParent, destName, source, opts.onConflict ?? 'error', true);
  }

  copy(
    src: string,
    dest: string,
    opts: { onConflict?: ConflictPolicy } = {},
  ): void {
    const source = this.resolveNode(src);
    if (source.parent === null) {
      throw new InvalidOperationError('Cannot copy the root directory');
    }
    const { destParent, destName } = this.resolveDestination(dest, source.name);
    this.placeInto(destParent, destName, source, opts.onConflict ?? 'error', false);
  }

  /**
   * Pre-order walk over the subtree at `path`. The visitor is called for every node
   * before its children. Returning `false` from a directory visitor skips recursion
   * into that directory; returning `false` from a file visitor is ignored (files have
   * no children to skip). To halt the walk entirely, throw from the visitor.
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

  /**
   * Returns the absolute path of the first node whose name matches the pattern.
   * Pre-order (a parent dir is checked before its children); excludes the root node.
   */
  findFirst(pattern: RegExp, startPath?: string): string | null {
    const STOP = Symbol('findFirst-stop');
    let hit: string | null = null;
    try {
      this.walk(startPath ?? this.pwd(), (node, p) => {
        if (node !== this.root && pattern.test(node.name)) {
          hit = p;
          throw STOP;
        }
      });
    } catch (e) {
      if (e !== STOP) throw e;
    }
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

  /**
   * Interpret `dest`: if it resolves to an existing directory, the source is placed
   * INSIDE it under its current name. Otherwise the trailing segment of `dest` is the
   * new leaf name and intermediate dirs must already exist.
   */
  private resolveDestination(
    dest: string,
    sourceName: string,
  ): { destParent: DirectoryNode; destName: string } {
    try {
      const existing = this.resolveNode(dest);
      if (isDirectory(existing)) {
        return { destParent: existing, destName: sourceName };
      }
    } catch (e) {
      // Only "dest does not exist" should fall through to resolveParent. Anything else
      // (e.g. NotADirectoryError from traversing through a file) must propagate.
      if (!(e instanceof NotFoundError)) throw e;
    }
    const { parent, name } = this.resolveParent(dest);
    return { destParent: parent, destName: name };
  }

  /**
   * Core of move/copy. Inserts (or merges) `source` into `destParent` under
   * `desiredName`, honouring the collision policy. When moving and a merge happens,
   * the source's original children are detached after merging.
   */
  private placeInto(
    destParent: DirectoryNode,
    desiredName: string,
    source: FsNode,
    policy: ConflictPolicy,
    isMove: boolean,
  ): void {
    const collision = destParent.children.get(desiredName);

    // Dir-vs-dir same name: ALWAYS merge recursively, regardless of policy.
    // Policies (error/overwrite/rename) apply to file-vs-file collisions discovered
    // during the merge or to top-level non-dir collisions. This matches the behaviour
    // documented in the spec and roughly mirrors `cp -r` / `mv` semantics.
    if (collision && isDirectory(collision) && isDirectory(source)) {
      for (const child of [...source.children.values()]) {
        this.placeInto(collision, child.name, child, policy, isMove);
      }
      if (isMove) {
        // If cwd is inside the merged-away subtree, move it to the source's parent.
        if (this.isAncestorOrSelf(source, this.cwd)) {
          this.cwd = source.parent!;
        }
        source.parent!.children.delete(source.name);
        source.parent = null;
      }
      return;
    }

    let finalName = desiredName;
    if (collision) {
      if (collision === source) return; // no-op
      if (policy === 'error') {
        throw new AlreadyExistsError(`Already exists: ${desiredName}`);
      }
      if (policy === 'rename') {
        finalName = nextFreeName(destParent, desiredName);
      } else if (policy === 'overwrite') {
        if (isDirectory(collision) || isDirectory(source)) {
          throw new InvalidOperationError(
            `Refusing to overwrite ${collision.kind} with ${source.kind}: ${desiredName}`,
          );
        }
        // copy + overwrite: just replace content, keep collision node
        if (!isMove) {
          if (isFile(collision) && isFile(source)) {
            collision.content = source.content;
          }
          return;
        }
        // move + overwrite: remove the collision first, then place normally
        destParent.children.delete(desiredName);
      }
    }

    if (isMove) {
      source.parent!.children.delete(source.name);
      source.name = finalName;
      source.parent = destParent;
      destParent.children.set(finalName, source);
    } else {
      const cloned = cloneNodeTree(source, destParent, finalName);
      destParent.children.set(finalName, cloned);
    }
  }
}
