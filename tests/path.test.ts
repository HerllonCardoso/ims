import { parsePath } from '../src/core/path';
import { InvalidPathError } from '../src/core/errors';

describe('parsePath', () => {
  it('parses an absolute path', () => {
    expect(parsePath('/a/b/c')).toEqual({ absolute: true, segments: ['a', 'b', 'c'] });
  });
  it('parses a relative path', () => {
    expect(parsePath('a/b')).toEqual({ absolute: false, segments: ['a', 'b'] });
  });
  it('treats "/" as root with no segments', () => {
    expect(parsePath('/')).toEqual({ absolute: true, segments: [] });
  });
  it('drops empty segments from trailing/double slashes', () => {
    expect(parsePath('/a//b/')).toEqual({ absolute: true, segments: ['a', 'b'] });
  });
  it('drops "." segments', () => {
    expect(parsePath('./a/./b')).toEqual({ absolute: false, segments: ['a', 'b'] });
  });
  it('preserves ".." segments', () => {
    expect(parsePath('../a/../b')).toEqual({
      absolute: false,
      segments: ['..', 'a', '..', 'b'],
    });
  });
  it('throws InvalidPathError on empty input', () => {
    expect(() => parsePath('')).toThrow(InvalidPathError);
  });

  it('throws InvalidPathError on whitespace-only input', () => {
    expect(() => parsePath('   ')).toThrow(InvalidPathError);
    expect(() => parsePath('\t\n')).toThrow(InvalidPathError);
  });

  it('treats only-slashes as root with no segments', () => {
    expect(parsePath('////')).toEqual({ absolute: true, segments: [] });
  });

  it('parses ".." alone', () => {
    expect(parsePath('..')).toEqual({ absolute: false, segments: ['..'] });
  });

  it('parses "." alone', () => {
    expect(parsePath('.')).toEqual({ absolute: false, segments: [] });
  });
});
