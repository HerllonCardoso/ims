import { FileSystem } from '../src/core/filesystem';
import {
  AlreadyExistsError,
  InvalidOperationError,
} from '../src/core/errors';

function seed(): FileSystem {
  const fs = new FileSystem();
  fs.mkdir('src/a', { recursive: true });
  fs.createFile('/src/a/x.txt');
  fs.writeFile('/src/a/x.txt', 'hello');
  fs.mkdir('/dest');
  return fs;
}

describe('FileSystem — move (extended)', () => {
  it('moves a file INTO an existing destination directory', () => {
    const fs = seed();
    fs.move('/src/a/x.txt', '/dest');
    expect(fs.ls('/dest')).toEqual(['x.txt']);
    expect(fs.readFile('/dest/x.txt')).toBe('hello');
    expect(fs.ls('/src/a')).toEqual([]);
  });

  it('moves and renames when destination is a non-existent leaf', () => {
    const fs = seed();
    fs.move('/src/a/x.txt', '/dest/y.txt');
    expect(fs.ls('/dest')).toEqual(['y.txt']);
  });

  it('refuses to move a directory into its own descendant', () => {
    const fs = seed();
    expect(() => fs.move('/src', '/src/a/inner')).toThrow(InvalidOperationError);
  });

  it('default policy "error" throws on a file-vs-file collision', () => {
    const fs = seed();
    fs.createFile('/dest/x.txt');
    expect(() => fs.move('/src/a/x.txt', '/dest')).toThrow(AlreadyExistsError);
  });

  it('policy "overwrite" replaces file content on collision', () => {
    const fs = seed();
    fs.createFile('/dest/x.txt');
    fs.writeFile('/dest/x.txt', 'OLD');
    fs.move('/src/a/x.txt', '/dest', { onConflict: 'overwrite' });
    expect(fs.readFile('/dest/x.txt')).toBe('hello');
  });

  it('policy "rename" picks the next free name', () => {
    const fs = seed();
    fs.createFile('/dest/x.txt');
    fs.move('/src/a/x.txt', '/dest', { onConflict: 'rename' });
    expect(fs.ls('/dest').sort()).toEqual(['x (1).txt', 'x.txt']);
  });

  it('merges two directories with the same name', () => {
    const fs = new FileSystem();
    fs.mkdir('/A/x', { recursive: true });
    fs.createFile('/A/x/one.txt');
    fs.mkdir('/B/x', { recursive: true });
    fs.createFile('/B/x/two.txt');
    fs.move('/A/x', '/B'); // /B already contains x -> merge
    expect(fs.ls('/B/x').sort()).toEqual(['one.txt', 'two.txt']);
    expect(fs.ls('/A')).toEqual([]);
  });

  it('relocates cwd when cwd is inside a merged-away source directory', () => {
    const fs = new FileSystem();
    fs.mkdir('/A/x', { recursive: true });
    fs.createFile('/A/x/one.txt');
    fs.mkdir('/B/x', { recursive: true });
    fs.cd('/A/x');
    fs.move('/A/x', '/B'); // merges /A/x into /B/x; /A/x is detached
    expect(fs.pwd()).toBe('/A');
  });

  it('move with { recursive: true } auto-creates missing destination directories', () => {
    const fs = seed();
    fs.move('/src/a/x.txt', '/dest/new/sub/y.txt', { recursive: true });
    expect(fs.readFile('/dest/new/sub/y.txt')).toBe('hello');
    expect(fs.ls('/src/a')).toEqual([]);
  });

  it('move WITHOUT recursive errors when destination intermediates are missing', () => {
    const fs = seed();
    expect(() => fs.move('/src/a/x.txt', '/dest/new/sub/y.txt')).toThrow();
  });
});

describe('FileSystem — copy', () => {
  it('deep-clones a file (independent content)', () => {
    const fs = seed();
    fs.copy('/src/a/x.txt', '/dest/x.txt');
    fs.writeFile('/dest/x.txt', 'changed');
    expect(fs.readFile('/src/a/x.txt')).toBe('hello');
    expect(fs.readFile('/dest/x.txt')).toBe('changed');
  });

  it('deep-clones a directory (independent children)', () => {
    const fs = seed();
    fs.copy('/src/a', '/dest'); // creates /dest/a
    fs.createFile('/dest/a/new.txt');
    expect(fs.ls('/src/a')).toEqual(['x.txt']);
    expect(fs.ls('/dest/a').sort()).toEqual(['new.txt', 'x.txt']);
  });

  it('merges two directories on copy with the same name', () => {
    const fs = new FileSystem();
    fs.mkdir('/A/x', { recursive: true });
    fs.createFile('/A/x/one.txt');
    fs.mkdir('/B/x', { recursive: true });
    fs.createFile('/B/x/two.txt');
    fs.copy('/A/x', '/B');
    expect(fs.ls('/B/x').sort()).toEqual(['one.txt', 'two.txt']);
    // original still intact
    expect(fs.ls('/A/x')).toEqual(['one.txt']);
  });

  it('copy with policy "overwrite" replaces collision file content but keeps the original', () => {
    const fs = seed();
    fs.createFile('/dest/x.txt');
    fs.writeFile('/dest/x.txt', 'OLD');
    fs.copy('/src/a/x.txt', '/dest', { onConflict: 'overwrite' });
    expect(fs.readFile('/dest/x.txt')).toBe('hello');
    // original still intact:
    expect(fs.readFile('/src/a/x.txt')).toBe('hello');
    // mutating the copy doesn't touch the original (independent nodes):
    fs.writeFile('/dest/x.txt', 'CHANGED');
    expect(fs.readFile('/src/a/x.txt')).toBe('hello');
  });

  it('copy with { recursive: true } auto-creates missing destination directories', () => {
    const fs = seed();
    fs.copy('/src/a/x.txt', '/dest/new/sub/y.txt', { recursive: true });
    expect(fs.readFile('/dest/new/sub/y.txt')).toBe('hello');
    // original still intact
    expect(fs.readFile('/src/a/x.txt')).toBe('hello');
  });
});
