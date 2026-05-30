import { build } from './helpers';
import type { ErrorResponse, MoveCopyResponse } from '@ims/shared';

describe('POST /api/move', () => {
  it('moves a file', async () => {
    const { app, fs } = build();
    fs.createFile('/a.txt');
    fs.mkdir('/d');
    const res = await app.inject({
      method: 'POST',
      url: '/api/move',
      payload: { src: '/a.txt', dest: '/d/a.txt' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<MoveCopyResponse>()).toEqual({ src: '/a.txt', dest: '/d/a.txt' });
    expect(fs.ls('/d')).toContain('a.txt');
  });

  it('409 on conflict with default error policy', async () => {
    const { app, fs } = build();
    fs.createFile('/a');
    fs.createFile('/b');
    const res = await app.inject({
      method: 'POST',
      url: '/api/move',
      payload: { src: '/a', dest: '/b' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json<ErrorResponse>().error).toBe('AlreadyExistsError');
  });

  it('overwrites with onConflict: overwrite', async () => {
    const { app, fs } = build();
    fs.createFile('/a');
    fs.writeFile('/a', 'src');
    fs.createFile('/b');
    fs.writeFile('/b', 'dest');
    const res = await app.inject({
      method: 'POST',
      url: '/api/move',
      payload: { src: '/a', dest: '/b', onConflict: 'overwrite' },
    });
    expect(res.statusCode).toBe(200);
    expect(fs.readFile('/b')).toBe('src');
  });

  it('renames with onConflict: rename', async () => {
    const { app, fs } = build();
    fs.createFile('/a');
    fs.createFile('/b');
    const res = await app.inject({
      method: 'POST',
      url: '/api/move',
      payload: { src: '/a', dest: '/b', onConflict: 'rename' },
    });
    expect(res.statusCode).toBe(200);
    expect(fs.ls('/').sort()).toEqual(['b', 'b (1)']);
  });

  it('creates intermediate dest dirs with recursive: true', async () => {
    const { app, fs } = build();
    fs.createFile('/a');
    const res = await app.inject({
      method: 'POST',
      url: '/api/move',
      payload: { src: '/a', dest: '/x/y/a', recursive: true },
    });
    expect(res.statusCode).toBe(200);
    expect(fs.ls('/x/y')).toContain('a');
  });
});

describe('POST /api/copy', () => {
  it('copies a file leaving the source intact', async () => {
    const { app, fs } = build();
    fs.createFile('/a');
    fs.writeFile('/a', 'hello');
    fs.mkdir('/d');
    const res = await app.inject({
      method: 'POST',
      url: '/api/copy',
      payload: { src: '/a', dest: '/d/a' },
    });
    expect(res.statusCode).toBe(200);
    expect(fs.readFile('/a')).toBe('hello');
    expect(fs.readFile('/d/a')).toBe('hello');
  });

  it('409 on copy conflict', async () => {
    const { app, fs } = build();
    fs.createFile('/a');
    fs.createFile('/b');
    const res = await app.inject({
      method: 'POST',
      url: '/api/copy',
      payload: { src: '/a', dest: '/b' },
    });
    expect(res.statusCode).toBe(409);
  });
});
