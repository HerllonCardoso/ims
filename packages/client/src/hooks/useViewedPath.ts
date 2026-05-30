import { useEffect, useState } from 'react';

function decodeHashPath(raw: string): string {
  return raw
    .split('/')
    .map((seg) => {
      try {
        return decodeURIComponent(seg);
      } catch {
        return seg;
      }
    })
    .join('/');
}

function encodeHashPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function readHash(): string {
  const raw = window.location.hash.replace(/^#/, '');
  const decoded = decodeHashPath(raw);
  return decoded.startsWith('/') ? decoded : '/';
}

export function useViewedPath(): [string, (next: string) => void] {
  const [path, setPath] = useState<string>(readHash());

  useEffect(() => {
    const onHash = (): void => setPath(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const update = (next: string): void => {
    window.location.hash = `#${encodeHashPath(next)}`;
    setPath(next);
  };

  return [path, update];
}
