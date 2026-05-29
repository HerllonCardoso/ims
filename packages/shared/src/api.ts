export type NodeKind = 'file' | 'directory';

export interface EntrySummary {
  name: string;
  kind: NodeKind;
}

export interface ListEntriesResponse {
  path: string;
  entries: EntrySummary[];
}

export interface StatResponse {
  path: string;
  name: string;
  kind: NodeKind;
}

export interface CreateRequest {
  path: string;
  recursive?: boolean;
}

export interface CreateResponse {
  path: string;
}

export interface WriteFileRequest {
  path: string;
  content: string;
}

export interface ReadFileResponse {
  path: string;
  content: string;
}

export type ConflictPolicy = 'error' | 'overwrite' | 'rename';

export interface MoveCopyRequest {
  src: string;
  dest: string;
  onConflict?: ConflictPolicy;
  recursive?: boolean;
}

export interface MoveCopyResponse {
  src: string;
  dest: string;
}

export interface FindResponse {
  matches: string[];
}

export interface FindFirstResponse {
  match: string | null;
}

export interface TreeNode {
  name: string;
  path: string;
  kind: NodeKind;
  children?: TreeNode[];
}

export interface TreeResponse {
  root: TreeNode;
}

export interface ErrorResponse {
  error: string;
  message: string;
}
