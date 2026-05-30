import { build } from './helpers';

describe('DELETE /api/entries', () => {
  it('deletes a file', async () => {
    const { app, fs } = await build();
    fs.createFile('/a.txt');
    const res = await app.inject({ method: 'DELETE', url: '/api/entries?path=/a.txt' });
    expect(res.statusCode).toBe(204);
    expect(fs.ls('/')).not.toContain('a.txt');
  });

  it('deletes an empty directory', async () => {
    const { app, fs } = await build();
    fs.mkdir('/d');
    const res = await app.inject({ method: 'DELETE', url: '/api/entries?path=/d' });
    expect(res.statusCode).toBe(204);
    expect(fs.ls('/')).not.toContain('d');
  });

  it('409 on non-empty directory without recursive', async () => {
    const { app, fs } = await build();
    fs.mkdir('/d');
    fs.createFile('/d/a');
    const res = await app.inject({ method: 'DELETE', url: '/api/entries?path=/d' });
    expect(res.statusCode).toBe(409);
  });

  it('deletes non-empty dir with ?recursive=true', async () => {
    const { app, fs } = await build();
    fs.mkdir('/d');
    fs.createFile('/d/a');
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/entries?path=/d&recursive=true',
    });
    expect(res.statusCode).toBe(204);
    expect(fs.ls('/')).not.toContain('d');
  });

  it('400 on root', async () => {
    const { app } = await build();
    const res = await app.inject({ method: 'DELETE', url: '/api/entries?path=/' });
    expect(res.statusCode).toBe(400);
  });
});
