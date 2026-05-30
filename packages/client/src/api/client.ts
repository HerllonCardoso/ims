import type {
  CreateRequest,
  CreateResponse,
  FindFirstResponse,
  FindResponse,
  ListEntriesResponse,
  MoveCopyRequest,
  MoveCopyResponse,
  ReadFileResponse,
  StatResponse,
  TreeResponse,
  WriteFileRequest,
} from '@ims/shared';
import { request } from './request';

export const api = {
  listEntries: (path: string) =>
    request<ListEntriesResponse>('GET', `/api/entries?path=${encodeURIComponent(path)}`),

  stat: (path: string) =>
    request<StatResponse>('GET', `/api/entries/stat?path=${encodeURIComponent(path)}`),

  createDir: (body: CreateRequest) => request<CreateResponse>('POST', '/api/dirs', body),

  createFile: (body: CreateRequest) => request<CreateResponse>('POST', '/api/files', body),

  readFile: (path: string) =>
    request<ReadFileResponse>('GET', `/api/files/content?path=${encodeURIComponent(path)}`),

  writeFile: (body: WriteFileRequest) =>
    request<ReadFileResponse>('PUT', '/api/files/content', body),

  remove: (path: string, recursive: boolean) =>
    request<null>(
      'DELETE',
      `/api/entries?path=${encodeURIComponent(path)}&recursive=${recursive ? 'true' : 'false'}`,
    ),

  move: (body: MoveCopyRequest) => request<MoveCopyResponse>('POST', '/api/move', body),

  copy: (body: MoveCopyRequest) => request<MoveCopyResponse>('POST', '/api/copy', body),

  find: (name: string, from: string) =>
    request<FindResponse>(
      'GET',
      `/api/find?name=${encodeURIComponent(name)}&from=${encodeURIComponent(from)}`,
    ),

  findFirst: (pattern: string, from: string) =>
    request<FindFirstResponse>(
      'GET',
      `/api/find/first?pattern=${encodeURIComponent(pattern)}&from=${encodeURIComponent(from)}`,
    ),

  tree: (path: string, depth: number) =>
    request<TreeResponse>(
      'GET',
      `/api/tree?path=${encodeURIComponent(path)}&depth=${depth}`,
    ),
};
