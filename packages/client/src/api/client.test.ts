import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./request', () => ({
  request: vi.fn().mockResolvedValue({}),
  ApiError: class extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, msg: string) {
      super(msg);
      this.status = status;
      this.code = code;
    }
  },
}));

import { api } from './client';
import { request } from './request';

const req = vi.mocked(request);

beforeEach(() => req.mockResolvedValue({}));

describe('api URL construction', () => {
  it('listEntries encodes path', () => {
    api.listEntries('/new folder');
    expect(req).toHaveBeenCalledWith('GET', '/api/entries?path=%2Fnew%20folder');
  });

  it('stat encodes path', () => {
    api.stat('/my dir/file.txt');
    expect(req).toHaveBeenCalledWith('GET', '/api/entries/stat?path=%2Fmy%20dir%2Ffile.txt');
  });

  it('readFile encodes path', () => {
    api.readFile('/a b/c.txt');
    expect(req).toHaveBeenCalledWith('GET', '/api/files/content?path=%2Fa%20b%2Fc.txt');
  });

  it('remove encodes path', () => {
    api.remove('/a b', false);
    expect(req).toHaveBeenCalledWith('DELETE', '/api/entries?path=%2Fa%20b&recursive=false');
  });

  it('find encodes name and from', () => {
    api.find('my file', '/a b');
    expect(req).toHaveBeenCalledWith('GET', '/api/find?name=my%20file&from=%2Fa%20b');
  });

  it('tree encodes path', () => {
    api.tree('/a b', 2);
    expect(req).toHaveBeenCalledWith('GET', '/api/tree?path=%2Fa%20b&depth=2');
  });
});

describe('api body calls', () => {
  it('createDir posts path as JSON', () => {
    api.createDir({ path: '/d' });
    expect(req).toHaveBeenCalledWith('POST', '/api/dirs', { path: '/d' });
  });

  it('createFile posts path as JSON', () => {
    api.createFile({ path: '/f.txt' });
    expect(req).toHaveBeenCalledWith('POST', '/api/files', { path: '/f.txt' });
  });

  it('move posts src/dest as JSON', () => {
    api.move({ src: '/a', dest: '/b' });
    expect(req).toHaveBeenCalledWith('POST', '/api/move', { src: '/a', dest: '/b' });
  });

  it('copy posts src/dest as JSON', () => {
    api.copy({ src: '/a', dest: '/b' });
    expect(req).toHaveBeenCalledWith('POST', '/api/copy', { src: '/a', dest: '/b' });
  });
});
