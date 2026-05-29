import { build } from './helpers';
import type { ListEntriesResponse, StatResponse } from '@ims/shared';

describe('GET /api/entries', () => {
  it('lists root by default', async () => {
    const { app, fs } = build();
    fs.mkdir('/a');
    fs.createFile('/b.txt');
    const res = await app.inject({ method: 'GET', url: '/api/entries?path=/' });
    expect(res.statusCode).toBe(200);
    const body = res.json<ListEntriesResponse>();
    expect(body.path).toBe('/');
    expect(body.entries).toEqual([
      { name: 'a', kind: 'directory' },
      { name: 'b.txt', kind: 'file' },
    ]);
  });

  it('400 when path points at a file', async () => {
    const { app, fs } = build();
    fs.createFile('/f');
    const res = await app.inject({ method: 'GET', url: '/api/entries?path=/f' });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/entries/stat', () => {
  it('returns stat for a file', async () => {
    const { app, fs } = build();
    fs.createFile('/x.txt');
    const res = await app.inject({ method: 'GET', url: '/api/entries/stat?path=/x.txt' });
    expect(res.statusCode).toBe(200);
    expect(res.json<StatResponse>()).toEqual({ path: '/x.txt', name: 'x.txt', kind: 'file' });
  });

  it('returns stat for root', async () => {
    const { app } = build();
    const res = await app.inject({ method: 'GET', url: '/api/entries/stat?path=/' });
    expect(res.json<StatResponse>()).toEqual({ path: '/', name: '', kind: 'directory' });
  });

  it('404 on missing', async () => {
    const { app } = build();
    const res = await app.inject({ method: 'GET', url: '/api/entries/stat?path=/nope' });
    expect(res.statusCode).toBe(404);
  });
});
