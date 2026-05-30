import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useApi } from './useApi';

describe('useApi', () => {
  it('returns data after fetcher resolves', async () => {
    const fetcher = vi.fn().mockResolvedValue({ count: 1 });
    const { result } = renderHook(() => useApi(fetcher, [], 0));
    await waitFor(() => expect(result.current.data).toEqual({ count: 1 }));
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('refetches when revision changes', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ n: 1 })
      .mockResolvedValueOnce({ n: 2 });
    const { result, rerender } = renderHook(({ rev }: { rev: number }) => useApi(fetcher, [], rev), {
      initialProps: { rev: 0 },
    });
    await waitFor(() => expect(result.current.data).toEqual({ n: 1 }));
    rerender({ rev: 1 });
    await waitFor(() => expect(result.current.data).toEqual({ n: 2 }));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('surfaces errors', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useApi(fetcher, [], 0));
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect((result.current.error as Error).message).toBe('boom');
    expect(result.current.data).toBeNull();
  });
});
