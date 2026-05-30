import { build } from './helpers';
import type { ErrorResponse } from '@ims/shared';

describe('error envelope', () => {
  it('maps NotFoundError to 404', async () => {
    const { app } = await build();
    const res = await app.inject({ method: 'GET', url: '/api/entries?path=/nope' });
    expect(res.statusCode).toBe(404);
    const body = res.json<ErrorResponse>();
    expect(body.error).toBe('NotFoundError');
    expect(typeof body.message).toBe('string');
  });

  it('maps AlreadyExistsError to 409', async () => {
    const { app, fs } = await build();
    fs.createFile('/a.txt');
    const res = await app.inject({
      method: 'POST',
      url: '/api/files',
      payload: { path: '/a.txt' },
    });
    expect(res.statusCode).toBe(409);
    const body = res.json<ErrorResponse>();
    expect(body.error).toBe('AlreadyExistsError');
  });

  it('maps NotADirectoryError to 400', async () => {
    const { app, fs } = await build();
    fs.createFile('/a.txt');
    const res = await app.inject({ method: 'GET', url: '/api/entries?path=/a.txt' });
    expect(res.statusCode).toBe(400);
    expect(res.json<ErrorResponse>().error).toBe('NotADirectoryError');
  });

  it('maps DirectoryNotEmptyError to 409', async () => {
    const { app, fs } = await build();
    fs.mkdir('/d');
    fs.createFile('/d/a');
    const res = await app.inject({ method: 'DELETE', url: '/api/entries?path=/d' });
    expect(res.statusCode).toBe(409);
    expect(res.json<ErrorResponse>().error).toBe('DirectoryNotEmptyError');
  });

  it('maps Fastify validation failure to 400', async () => {
    const { app } = await build();
    const res = await app.inject({
      method: 'POST',
      url: '/api/dirs',
      payload: { wrong: true },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<ErrorResponse>().error).toBe('InvalidRequestError');
  });
});
