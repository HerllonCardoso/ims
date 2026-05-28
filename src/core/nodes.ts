export type NodeKind = 'file' | 'directory';

export abstract class FsNode {
  abstract readonly kind: NodeKind;
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
