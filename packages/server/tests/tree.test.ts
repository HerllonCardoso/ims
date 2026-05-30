import { build } from './helpers';
import type { TreeResponse } from '@ims/shared';

describe('GET /api/tree', () => {
  it('returns only immediate children at depth=1', async () => {
    const { app, fs } = await build();
    fs.mkdir('/a');
    fs.createFile('/a/x');
    fs.createFile('/b');
    const res = await app.inject({ method: 'GET', url: '/api/tree?path=/&depth=1' });
    expect(res.statusCode).toBe(200);
    const root = res.json<TreeResponse>().root;
    expect(root.path).toBe('/');
    expect(root.children).toBeDefined();
    expect(root.children!.map((c) => c.name).sort()).toEqual(['a', 'b']);
    const a = root.children!.find((c) => c.name === 'a')!;
    expect(a.children).toBeUndefined();
  });

  it('caps at depth=N', async () => {
    const { app, fs } = await build();
    fs.mkdir('/a');
    fs.mkdir('/a/b');
    fs.mkdir('/a/b/c');
    const res = await app.inject({ method: 'GET', url: '/api/tree?path=/&depth=2' });
    const root = res.json<TreeResponse>().root;
    const a = root.children!.find((c) => c.name === 'a')!;
    const b = a.children!.find((c) => c.name === 'b')!;
    expect(b.children).toBeUndefined();
  });

  it('404s for missing roots even at depth=0', async () => {
    const { app } = await build();
    const res = await app.inject({ method: 'GET', url: '/api/tree?path=/missing&depth=0' });

    expect(res.statusCode).toBe(404);
  });

  it('reports file roots as files at depth=0', async () => {
    const { app, fs } = await build();
    fs.createFile('/f');
    const res = await app.inject({ method: 'GET', url: '/api/tree?path=/f&depth=0' });

    expect(res.statusCode).toBe(200);
    expect(res.json<TreeResponse>().root).toEqual({ name: 'f', path: '/f', kind: 'file' });
  });
});
