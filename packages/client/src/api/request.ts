import type { ErrorResponse } from '@ims/shared';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export async function request<T>(method: Method, url: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  if (res.status === 204) return null as T;
  if (!res.ok) {
    let envelope: Partial<ErrorResponse> = {};
    try {
      envelope = (await res.json()) as Partial<ErrorResponse>;
    } catch {
      envelope = {};
    }
    throw new ApiError(
      res.status,
      envelope.error ?? 'UnknownError',
      envelope.message ?? `Request failed: ${res.status}`,
    );
  }
  return (await res.json()) as T;
}
