import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, ApiError } from './request';

const mockFetch = vi.fn();
beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

describe('request', () => {
  it('returns parsed JSON on 2xx', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const data = await request<{ ok: boolean }>('GET', '/api/health');
    expect(data).toEqual({ ok: true });
  });

  it('returns null on 204', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const data = await request<null>('DELETE', '/api/entries?path=/x');
    expect(data).toBeNull();
  });

  it('throws ApiError carrying status, code, and message on 4xx', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'AlreadyExistsError', message: 'Already exists: a' }), {
        status: 409,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(request<unknown>('POST', '/api/dirs', { path: '/a' })).rejects.toMatchObject({
      status: 409,
      code: 'AlreadyExistsError',
      message: 'Already exists: a',
    });
  });

  it('serializes JSON bodies with content-type', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await request<unknown>('POST', '/api/dirs', { path: '/d' });
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(init.body).toBe(JSON.stringify({ path: '/d' }));
  });

  it('throws ApiError with generic message when body is not JSON', async () => {
    mockFetch.mockResolvedValueOnce(new Response('boom', { status: 500 }));
    await expect(request<unknown>('GET', '/api/x')).rejects.toBeInstanceOf(ApiError);
  });
});
