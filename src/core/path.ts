import { InvalidPathError } from './errors';

export interface ParsedPath {
  absolute: boolean;
  segments: string[];
}

/**
 * Pure path parser. Splits on '/', strips empty and '.' segments, preserves '..'.
 * Returns whether the original input was absolute (started with '/').
 */
export function parsePath(input: string): ParsedPath {
  if (input.length === 0) {
    throw new InvalidPathError('Path cannot be empty');
  }
  const absolute = input.startsWith('/');
  const segments = input
    .split('/')
    .filter((s) => s.length > 0 && s !== '.');
  return { absolute, segments };
}
