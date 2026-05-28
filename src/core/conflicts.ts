import { DirectoryNode, FileNode, FsNode, isDirectory, isFile } from './nodes';

/** Policy for file-vs-file (or file-vs-dir) collisions during move/copy. */
export type ConflictPolicy = 'error' | 'overwrite' | 'rename';

/**
 * Given a directory and a desired child name, return a name that is free in `dir`.
 * If `desired` is already free returns it unchanged; otherwise appends " (1)",
 * " (2)", … (preserving any extension) until a free name is found.
 */
export function nextFreeName(dir: DirectoryNode, desired: string): string {
  if (!dir.children.has(desired)) return desired;
  const dot = desired.lastIndexOf('.');
  const base = dot > 0 ? desired.slice(0, dot) : desired;
  const ext = dot > 0 ? desired.slice(dot) : '';
  for (let i = 1; ; i++) {
    const candidate = `${base} (${i})${ext}`;
    if (!dir.children.has(candidate)) return candidate;
  }
}

/** Deep-clone a node subtree, detaching it from any parent. */
export function cloneNodeTree(
  source: FsNode,
  newParent: DirectoryNode | null,
  newName?: string,
): FsNode {
  if (isFile(source)) {
    const f = new FileNode(newName ?? source.name, newParent);
    f.content = source.content;
    return f;
  }
  if (isDirectory(source)) {
    const d = new DirectoryNode(newName ?? source.name, newParent);
    for (const [, child] of source.children) {
      const cloned = cloneNodeTree(child, d);
      d.children.set(cloned.name, cloned);
    }
    return d;
  }
  // unreachable: FsNode is the union of FileNode and DirectoryNode
  throw new Error('Unknown node kind');
}
