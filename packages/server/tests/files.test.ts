import { build } from './helpers';
import type { ReadFileResponse } from '@ims/shared';

describe('GET /api/files/content', () => {
  it('returns empty string for a new file', async () => {
    const { app, fs } = build();
    fs.createFile('/a.txt');
    const res = await app.inject({ method: 'GET', url: '/api/files/content?path=/a.txt' });
    expect(res.statusCode).toBe(200);
    expect(res.json<ReadFileResponse>()).toEqual({ path: '/a.txt', content: '' });
  });

  it('400 when path is a directory', async () => {
    const { app, fs } = build();
    fs.mkdir('/d');
    const res = await app.inject({ method: 'GET', url: '/api/files/content?path=/d' });
    expect(res.statusCode).toBe(400);
  });

  it('404 when missing', async () => {
    const { app } = build();
    const res = await app.inject({ method: 'GET', url: '/api/files/content?path=/nope' });
    expect(res.statusCode).toBe(404);
  });
});

describe('PUT /api/files/content', () => {
  it('writes content', async () => {
    const { app, fs } = build();
    fs.createFile('/a.txt');
    const res = await app.inject({
      method: 'PUT',
      url: '/api/files/content',
      payload: { path: '/a.txt', content: 'hello' },
    });
    expect(res.statusCode).toBe(200);
    expect(fs.readFile('/a.txt')).toBe('hello');
  });

  it('404 when file does not exist', async () => {
    const { app } = build();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/files/content',
      payload: { path: '/a.txt', content: 'x' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('400 on missing content', async () => {
    const { app } = build();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/files/content',
      payload: { path: '/a.txt' },
    });
    expect(res.statusCode).toBe(400);
  });
});
