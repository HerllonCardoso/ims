import { build } from './helpers';
import type { CreateResponse, ErrorResponse } from '@ims/shared';

describe('POST /api/dirs', () => {
  it('creates a directory', async () => {
    const { app, fs } = build();
    const res = await app.inject({
      method: 'POST',
      url: '/api/dirs',
      payload: { path: '/d' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json<CreateResponse>().path).toBe('/d');
    expect(fs.ls('/')).toContain('d');
  });

  it('creates intermediate dirs with recursive: true', async () => {
    const { app, fs } = build();
    const res = await app.inject({
      method: 'POST',
      url: '/api/dirs',
      payload: { path: '/a/b/c', recursive: true },
    });
    expect(res.statusCode).toBe(201);
    expect(fs.ls('/a/b')).toContain('c');
  });

  it('409 when already exists', async () => {
    const { app, fs } = build();
    fs.mkdir('/d');
    const res = await app.inject({
      method: 'POST',
      url: '/api/dirs',
      payload: { path: '/d' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json<ErrorResponse>().error).toBe('AlreadyExistsError');
  });

  it('400 on malformed body', async () => {
    const { app } = build();
    const res = await app.inject({ method: 'POST', url: '/api/dirs', payload: {} });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/files', () => {
  it('creates an empty file', async () => {
    const { app, fs } = build();
    const res = await app.inject({
      method: 'POST',
      url: '/api/files',
      payload: { path: '/a.txt' },
    });
    expect(res.statusCode).toBe(201);
    expect(fs.readFile('/a.txt')).toBe('');
  });

  it('409 when already exists', async () => {
    const { app, fs } = build();
    fs.createFile('/a.txt');
    const res = await app.inject({
      method: 'POST',
      url: '/api/files',
      payload: { path: '/a.txt' },
    });
    expect(res.statusCode).toBe(409);
  });
});
