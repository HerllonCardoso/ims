import { useEffect, useState } from 'react';

function readHash(): string {
  const raw = window.location.hash.replace(/^#/, '');
  return raw.startsWith('/') ? raw : '/';
}

export function useViewedPath(): [string, (next: string) => void] {
  const [path, setPath] = useState<string>(readHash());

  useEffect(() => {
    const onHash = (): void => setPath(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const update = (next: string): void => {
    window.location.hash = `#${next}`;
    setPath(next);
  };

  return [path, update];
}
