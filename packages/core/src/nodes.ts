import { createNodePermissions, type NodePermissions } from './permissions';

export type NodeKind = 'file' | 'directory';

export abstract class FsNode {
  abstract readonly kind: NodeKind;
  permissions: NodePermissions = createNodePermissions();

  constructor(
    public name: string,
    public parent: DirectoryNode | null,
  ) {}
}

export class FileNode extends FsNode {
  readonly kind = 'file';
  content = '';
}

export class DirectoryNode extends FsNode {
  readonly kind = 'directory';
  readonly children = new Map<string, FsNode>();
}

export function isDirectory(node: FsNode): node is DirectoryNode {
  return node.kind === 'directory';
}

export function isFile(node: FsNode): node is FileNode {
  return node.kind === 'file';
}
