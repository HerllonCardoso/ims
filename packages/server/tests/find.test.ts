import { build } from './helpers';
import type { FindFirstResponse, FindResponse } from '@ims/shared';

describe('GET /api/find', () => {
  it('returns every match by exact name', async () => {
    const { app, fs } = await build();
    fs.mkdir('/a');
    fs.createFile('/a/x');
    fs.mkdir('/b');
    fs.createFile('/b/x');
    const res = await app.inject({ method: 'GET', url: '/api/find?name=x&from=/' });
    expect(res.statusCode).toBe(200);
    expect(res.json<FindResponse>().matches.sort()).toEqual(['/a/x', '/b/x']);
  });

  it('returns empty matches when nothing found', async () => {
    const { app } = await build();
    const res = await app.inject({ method: 'GET', url: '/api/find?name=x&from=/' });
    expect(res.json<FindResponse>().matches).toEqual([]);
  });
});

describe('GET /api/find/first', () => {
  it('returns the first regex match', async () => {
    const { app, fs } = await build();
    fs.mkdir('/a');
    fs.createFile('/a/foo');
    const res = await app.inject({
      method: 'GET',
      url: '/api/find/first?pattern=' + encodeURIComponent('^foo$') + '&from=/',
    });
    expect(res.json<FindFirstResponse>().match).toBe('/a/foo');
  });

  it('returns null when no match', async () => {
    const { app } = await build();
    const res = await app.inject({
      method: 'GET',
      url: '/api/find/first?pattern=' + encodeURIComponent('^foo$') + '&from=/',
    });
    expect(res.json<FindFirstResponse>().match).toBeNull();
  });
});
