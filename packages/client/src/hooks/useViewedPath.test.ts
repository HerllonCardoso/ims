import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewedPath } from './useViewedPath';

beforeEach(() => {
  window.location.hash = '';
});

describe('useViewedPath', () => {
  it('defaults to / when hash is empty', () => {
    const { result } = renderHook(() => useViewedPath());
    expect(result.current[0]).toBe('/');
  });

  it('reads plain path from hash', () => {
    window.location.hash = '#/foo/bar';
    const { result } = renderHook(() => useViewedPath());
    expect(result.current[0]).toBe('/foo/bar');
  });

  it('decodes percent-encoded segments (spaces in folder names)', () => {
    window.location.hash = '#/new%20folder%202';
    const { result } = renderHook(() => useViewedPath());
    expect(result.current[0]).toBe('/new folder 2');
  });

  it('update encodes path segments into the hash', () => {
    const { result } = renderHook(() => useViewedPath());
    act(() => {
      result.current[1]('/new folder 2');
    });
    expect(window.location.hash).toBe('#/new%20folder%202');
    expect(result.current[0]).toBe('/new folder 2');
  });

  it('responds to hashchange events', () => {
    const { result } = renderHook(() => useViewedPath());
    act(() => {
      window.location.hash = '#/other';
      window.dispatchEvent(new Event('hashchange'));
    });
    expect(result.current[0]).toBe('/other');
  });
});
