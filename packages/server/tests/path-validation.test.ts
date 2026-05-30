import { build } from './helpers';
import type { ErrorResponse } from '@ims/shared';

describe('absolute path validation', () => {
  it('rejects relative create paths before reaching core', async () => {
    const { app } = await build();
    const res = await app.inject({
      method: 'POST',
      url: '/api/dirs',
      payload: { path: 'relative' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ErrorResponse>().error).toBe('InvalidRequestError');
  });

  it('rejects relative query paths', async () => {
    const { app } = await build();
    const res = await app.inject({ method: 'GET', url: '/api/entries?path=relative' });

    expect(res.statusCode).toBe(400);
    expect(res.json<ErrorResponse>().error).toBe('InvalidRequestError');
  });

  it('rejects relative move sources and destinations', async () => {
    const { app } = await build();
    const relativeSrc = await app.inject({
      method: 'POST',
      url: '/api/move',
      payload: { src: 'a', dest: '/b' },
    });
    const relativeDest = await app.inject({
      method: 'POST',
      url: '/api/move',
      payload: { src: '/a', dest: 'b' },
    });

    expect(relativeSrc.statusCode).toBe(400);
    expect(relativeDest.statusCode).toBe(400);
  });

  it('rejects relative find start paths', async () => {
    const { app } = await build();
    const res = await app.inject({ method: 'GET', url: '/api/find?name=x&from=relative' });

    expect(res.statusCode).toBe(400);
  });
});
