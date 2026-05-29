import { DirectoryNode, FileNode, type FsNode, type NodeKind, isDirectory, isFile } from './nodes';
import { parsePath } from './path';
import { cloneNodeTree, nextFreeName, type ConflictPolicy } from './conflicts';
import {
  AlreadyExistsError,
  DirectoryNotEmptyError,
  GroupNotFoundError,
  InvalidOperationError,
  InvalidPathError,
  NotADirectoryError,
  NotAFileError,
  NotFoundError,
  PermissionDeniedError,
  UserNotFoundError,
} from './errors';
import { normalizePermissions, type PermissionName, type PermissionUpdate } from './permissions';

export interface WalkNode {
  readonly kind: NodeKind;
  readonly name: string;
}

export type WalkVisitor = (node: WalkNode, path: string) => boolean | void;

interface ResolvedParent {
  parent: DirectoryNode;
  name: string;
  created: DirectoryNode[];
}

interface ResolvedDestination {
  destParent: DirectoryNode;
  destName: string;
  created: DirectoryNode[];
}

export class FileSystem {
  private readonly root: DirectoryNode;
  private cwd: DirectoryNode;
  private readonly users = new Map<string, Set<string>>();
  private readonly groups = new Set<string>();
  private currentUserName = 'root';

  constructor() {
    this.root = new DirectoryNode('', null);
    this.cwd = this.root;
    this.groups.add('root');
    this.users.set('root', new Set(['root']));
  }

  pwd(): string {
    return this.pathOf(this.cwd);
  }

  currentUser(): string {
    return this.currentUserName;
  }

  createUser(name: string): void {
    this.assertRootUser();
    this.validatePrincipalName(name, 'user');
    if (this.users.has(name)) {
      throw new AlreadyExistsError(`User already exists: ${name}`);
    }
    this.users.set(name, new Set());
  }

  createGroup(name: string): void {
    this.assertRootUser();
    this.validatePrincipalName(name, 'group');
    if (this.groups.has(name)) {
      throw new AlreadyExistsError(`Group already exists: ${name}`);
    }
    this.groups.add(name);
  }

  addUserToGroup(user: string, group: string): void {
    this.assertRootUser();
    const memberships = this.requireUser(user);
    this.requireGroup(group);
    memberships.add(group);
  }

  switchUser(name: string): void {
    this.requireUser(name);
    this.currentUserName = name;
  }

  grantUser(path: string, user: string, permissions: PermissionUpdate): void {
    this.assertRootUser();
    this.requireUser(user);
    const node = this.resolveNode(path);
    node.permissions.users.set(user, normalizePermissions(permissions));
  }

  grantGroup(path: string, group: string, permissions: PermissionUpdate): void {
    this.assertRootUser();
    this.requireGroup(group);
    const node = this.resolveNode(path);
    node.permissions.groups.set(group, normalizePermissions(permissions));
  }

  revokeUser(path: string, user: string): void {
    this.assertRootUser();
    this.requireUser(user);
    const node = this.resolveNode(path);
    node.permissions.users.delete(user);
  }

  revokeGroup(path: string, group: string): void {
    this.assertRootUser();
    this.requireGroup(group);
    const node = this.resolveNode(path);
    node.permissions.groups.delete(group);
  }

  cd(path: string): void {
    const node = this.resolveNode(path);
    if (!isDirectory(node)) {
      throw new NotADirectoryError(`Not a directory: ${path}`);
    }
    this.assertPermission(node, 'read');
    this.cwd = node;
  }

  mkdir(path: string, opts: { recursive?: boolean } = {}): void {
    const { parent, name } = this.resolveParent(path, opts);
    this.assertPermission(parent, 'write');
    const existing = parent.children.get(name);
    if (existing) {
      if (opts.recursive && isDirectory(existing)) {
        return;
      }
      throw new AlreadyExistsError(`Already exists: ${name}`);
    }
    const dir = new DirectoryNode(name, parent);
    this.grantCreatorAccess(dir);
    parent.children.set(name, dir);
  }

  ls(path?: string): string[] {
    const node = path === undefined ? this.cwd : this.resolveNode(path);
    if (!isDirectory(node)) {
      throw new NotADirectoryError(`Not a directory: ${path ?? this.pwd()}`);
    }
    this.assertPermission(node, 'read');
    return [...node.children.keys()].sort();
  }

  /** Sorted children with their node kind. Lets callers distinguish files from
   * directories without a second lookup (used by tab completion). */
  entries(path?: string): Array<{ name: string; kind: NodeKind }> {
    const node = path === undefined ? this.cwd : this.resolveNode(path);
    if (!isDirectory(node)) {
      throw new NotADirectoryError(`Not a directory: ${path ?? this.pwd()}`);
    }
    this.assertPermission(node, 'read');
    return [...node.children.values()]
      .map((c) => ({ name: c.name, kind: c.kind }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  rmdir(path: string, opts: { recursive?: boolean } = {}): void {
    const node = this.resolveNode(path);
    if (!isDirectory(node)) {
      throw new NotADirectoryError(`Not a directory: ${path}`);
    }
    if (node === this.root) {
      throw new InvalidOperationError('Cannot remove the root directory');
    }
    this.assertPermission(node.parent!, 'write');
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

  remove(path: string, opts: { recursive?: boolean } = {}): void {
    const node = this.resolveNode(path);
    if (node.parent === null) {
      throw new InvalidOperationError('Cannot remove the root directory');
    }
    this.assertPermission(node.parent, 'write');
    if (isDirectory(node)) {
      if (node.children.size > 0 && !opts.recursive) {
        throw new DirectoryNotEmptyError(`Directory not empty: ${path}`);
      }
      if (this.isAncestorOrSelf(node, this.cwd)) {
        this.cwd = node.parent;
      }
    }
    node.parent.children.delete(node.name);
    node.parent = null;
  }

  createFile(path: string, opts: { recursive?: boolean } = {}): void {
    const { parent, name } = this.resolveParent(path, opts);
    this.assertPermission(parent, 'write');
    if (parent.children.has(name)) {
      throw new AlreadyExistsError(`Already exists: ${name}`);
    }
    const file = new FileNode(name, parent);
    this.grantCreatorAccess(file);
    parent.children.set(name, file);
  }

  writeFile(path: string, content: string): void {
    const file = this.resolveFile(path);
    this.assertPermission(file, 'write');
    file.content = content;
  }

  readFile(path: string): string {
    const file = this.resolveFile(path);
    this.assertPermission(file, 'read');
    return file.content;
  }

  move(
    src: string,
    dest: string,
    opts: { onConflict?: ConflictPolicy; recursive?: boolean } = {},
  ): void {
    const source = this.resolveNode(src);
    if (source.parent === null) {
      throw new InvalidOperationError('Cannot move the root directory');
    }
    this.assertPermission(source.parent, 'write');
    const { destParent, destName, created } = this.resolveDestination(
      dest,
      source.name,
      opts.recursive,
    );
    try {
      this.assertPermission(destParent, 'write');
      if (source === destParent.children.get(destName)) return; // no-op
      if (isDirectory(source) && this.isAncestorOrSelf(source, destParent)) {
        throw new InvalidOperationError('Cannot move a directory into itself');
      }
      this.assertCanPlaceInto(destParent, destName, source, opts.onConflict ?? 'error');
      this.placeInto(destParent, destName, source, opts.onConflict ?? 'error', true);
    } catch (e) {
      this.rollbackCreated(created);
      throw e;
    }
  }

  copy(
    src: string,
    dest: string,
    opts: { onConflict?: ConflictPolicy; recursive?: boolean } = {},
  ): void {
    const source = this.resolveNode(src);
    if (source.parent === null) {
      throw new InvalidOperationError('Cannot copy the root directory');
    }
    this.assertReadableSubtree(source);
    const { destParent, destName, created } = this.resolveDestination(
      dest,
      source.name,
      opts.recursive,
    );
    try {
      this.assertPermission(destParent, 'write');
      this.assertCanPlaceInto(destParent, destName, source, opts.onConflict ?? 'error');
      this.placeInto(destParent, destName, source, opts.onConflict ?? 'error', false);
    } catch (e) {
      this.rollbackCreated(created);
      throw e;
    }
  }

  /**
   * Pre-order walk over the subtree at `path`. The visitor is called for every node
   * before its children. Children are visited in insertion order (not sorted; use
   * `ls()` for sorted listings). Returning `false` from a directory visitor skips
   * recursion into that directory; returning `false` from a file visitor is ignored.
   * To halt the walk entirely, throw from the visitor.
   */
  walk(path: string, visit: WalkVisitor): void {
    const start = this.resolveNode(path);
    const recurse = (node: FsNode): void => {
      this.assertPermission(node, 'read');
      const decision = visit(this.walkNode(node), this.pathOf(node));
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
    const stop = new Error('findFirst stop');
    let hit: string | null = null;
    const matches = (name: string): boolean => {
      const previousLastIndex = pattern.lastIndex;
      pattern.lastIndex = 0;
      const result = pattern.test(name);
      pattern.lastIndex = previousLastIndex;
      return result;
    };
    try {
      this.walk(startPath ?? this.pwd(), (node, p) => {
        if (p !== '/' && matches(node.name)) {
          hit = p;
          throw stop;
        }
      });
    } catch (e) {
      if (e !== stop) throw e;
    }
    return hit;
  }

  find(name: string, startPath?: string): string[] {
    const matches: string[] = [];
    this.walk(startPath ?? this.pwd(), (node, path) => {
      if (node.name === name && path !== '/') matches.push(path);
    });
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
      parts.push(n.name);
      n = n.parent;
    }
    return '/' + parts.reverse().join('/');
  }

  private walkNode(node: FsNode): WalkNode {
    return { kind: node.kind, name: node.name };
  }

  private validatePrincipalName(name: string, kind: 'user' | 'group'): void {
    if (name.trim().length === 0 || /\s/.test(name)) {
      throw new InvalidOperationError(`Invalid ${kind} name: ${name}`);
    }
  }

  private assertRootUser(): void {
    if (this.currentUserName !== 'root') {
      throw new PermissionDeniedError('Only root can manage users, groups, and permissions');
    }
  }

  private requireUser(name: string): Set<string> {
    const user = this.users.get(name);
    if (!user) {
      throw new UserNotFoundError(`User not found: ${name}`);
    }
    return user;
  }

  private requireGroup(name: string): void {
    if (!this.groups.has(name)) {
      throw new GroupNotFoundError(`Group not found: ${name}`);
    }
  }

  private hasPermission(node: FsNode, permission: PermissionName): boolean {
    if (this.currentUserName === 'root') return true;

    const userGrant = node.permissions.users.get(this.currentUserName);
    if (userGrant?.[permission]) return true;

    for (const group of this.requireUser(this.currentUserName)) {
      const groupGrant = node.permissions.groups.get(group);
      if (groupGrant?.[permission]) return true;
    }

    return false;
  }

  private assertPermission(node: FsNode, permission: PermissionName): void {
    if (!this.hasPermission(node, permission)) {
      throw new PermissionDeniedError(
        `Permission denied: ${this.currentUserName} lacks ${permission} on ${this.pathOf(node)}`,
      );
    }
  }

  private assertReadableSubtree(node: FsNode): void {
    this.assertPermission(node, 'read');
    if (isDirectory(node)) {
      for (const child of node.children.values()) {
        this.assertReadableSubtree(child);
      }
    }
  }

  private grantCreatorAccess(node: FsNode): void {
    if (this.currentUserName === 'root') return;
    node.permissions.users.set(this.currentUserName, { read: true, write: true });
  }

  /** Resolve a path to an existing node. Throws if any component is missing. */
  private resolveNode(path: string): FsNode {
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
  private resolveParent(path: string, opts: { recursive?: boolean } = {}): ResolvedParent {
    const { absolute, segments } = parsePath(path);
    if (segments.length === 0) {
      throw new InvalidOperationError(`Cannot operate on root: ${path}`);
    }
    const leaf = segments[segments.length - 1];
    if (leaf === '..') {
      throw new InvalidPathError(`Invalid trailing path segment: ${path}`);
    }
    let node: DirectoryNode = this.startNode(absolute);
    const created: DirectoryNode[] = [];
    try {
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
          this.assertPermission(node, 'write');
          const dir = new DirectoryNode(seg, node);
          this.grantCreatorAccess(dir);
          node.children.set(seg, dir);
          created.push(dir);
          next = dir;
        }
        if (!isDirectory(next)) {
          throw new NotADirectoryError(`Not a directory: ${seg}`);
        }
        node = next;
      }
      return { parent: node, name: leaf, created };
    } catch (e) {
      this.rollbackCreated(created);
      throw e;
    }
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
    recursive = false,
  ): ResolvedDestination {
    try {
      const existing = this.resolveNode(dest);
      if (isDirectory(existing)) {
        return { destParent: existing, destName: sourceName, created: [] };
      }
    } catch (e) {
      // Only "dest does not exist" should fall through to resolveParent. Anything else
      // (e.g. NotADirectoryError from traversing through a file) must propagate.
      if (!(e instanceof NotFoundError)) throw e;
    }
    const { parent, name, created } = this.resolveParent(dest, { recursive });
    return { destParent: parent, destName: name, created };
  }

  private rollbackCreated(created: DirectoryNode[]): void {
    for (const dir of [...created].reverse()) {
      const parent = dir.parent;
      if (parent && parent.children.get(dir.name) === dir && dir.children.size === 0) {
        parent.children.delete(dir.name);
        dir.parent = null;
      }
    }
  }

  /**
   * Validate a move/copy placement before mutating the tree. Recursive directory
   * merges can touch many children; preflight keeps failures all-or-nothing.
   */
  private assertCanPlaceInto(
    destParent: DirectoryNode,
    desiredName: string,
    source: FsNode,
    policy: ConflictPolicy,
  ): void {
    const collision = destParent.children.get(desiredName);
    if (!collision) return;
    if (collision === source) {
      if (policy === 'rename' || policy === 'overwrite') return;
      throw new AlreadyExistsError(`Already exists: ${desiredName}`);
    }

    if (isDirectory(collision) && isDirectory(source)) {
      this.assertPermission(collision, 'write');
      for (const child of source.children.values()) {
        this.assertCanPlaceInto(collision, child.name, child, policy);
      }
      return;
    }

    if (policy === 'error') {
      throw new AlreadyExistsError(`Already exists: ${desiredName}`);
    }

    if (policy === 'overwrite' && (isDirectory(collision) || isDirectory(source))) {
      throw new InvalidOperationError(
        `Refusing to overwrite ${collision.kind} with ${source.kind}: ${desiredName}`,
      );
    }
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
    if (collision && collision !== source && isDirectory(collision) && isDirectory(source)) {
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
      if (collision === source) {
        if (isMove || policy === 'overwrite') return; // no-op
        if (policy === 'rename') {
          finalName = nextFreeName(destParent, desiredName);
        } else {
          throw new AlreadyExistsError(`Already exists: ${desiredName}`);
        }
      } else if (policy === 'error') {
        throw new AlreadyExistsError(`Already exists: ${desiredName}`);
      } else if (policy === 'rename') {
        finalName = nextFreeName(destParent, desiredName);
      } else {
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
