import { FileSystem } from '../src/core/filesystem';

function setup(): FileSystem {
  const fs = new FileSystem();
  fs.mkdir('school');
  fs.cd('school');
  fs.mkdir('math');
  fs.cd('math');
  fs.createFile('notes.txt');
  fs.cd('..');
  fs.mkdir('history');
  fs.cd('history');
  fs.createFile('notes.txt');
  fs.cd('/');
  return fs;
}

describe('FileSystem — find', () => {
  it('finds every match by exact name in the subtree of cwd', () => {
    const fs = setup();
    fs.cd('/school');
    expect(fs.find('notes.txt').sort()).toEqual([
      '/school/history/notes.txt',
      '/school/math/notes.txt',
    ]);
  });

  it('returns an empty array when nothing matches', () => {
    const fs = setup();
    expect(fs.find('absent')).toEqual([]);
  });

  it('matches directory names too', () => {
    const fs = setup();
    expect(fs.find('math')).toEqual(['/school/math']);
  });

  it('accepts a startPath argument', () => {
    const fs = setup();
    expect(fs.find('notes.txt', '/school/history')).toEqual([
      '/school/history/notes.txt',
    ]);
  });
});

describe('FileSystem — walk', () => {
  function tree(): FileSystem {
    const fs = new FileSystem();
    fs.mkdir('a/b', { recursive: true });
    fs.createFile('/a/b/file1.txt');
    fs.mkdir('/a/c');
    fs.createFile('/a/c/file2.log');
    fs.createFile('/top.txt');
    return fs;
  }

  it('visits every node in pre-order from a directory', () => {
    const fs = tree();
    const seen: string[] = [];
    fs.walk('/', (_node, path) => {
      seen.push(path);
    });
    expect(seen.sort()).toEqual(
      [
        '/',
        '/a',
        '/a/b',
        '/a/b/file1.txt',
        '/a/c',
        '/a/c/file2.log',
        '/top.txt',
      ].sort(),
    );
  });

  it('visitor returning false on a directory prunes its subtree', () => {
    const fs = tree();
    const seen: string[] = [];
    fs.walk('/', (node, path) => {
      seen.push(path);
      if (node.name === 'b') return false; // do not recurse into /a/b
    });
    expect(seen).not.toContain('/a/b/file1.txt');
    expect(seen).toContain('/a/c/file2.log');
  });

  it('findFirst returns the first path matching a regex', () => {
    const fs = tree();
    const hit = fs.findFirst(/\.log$/);
    expect(hit).toBe('/a/c/file2.log');
  });

  it('findFirst returns null when nothing matches', () => {
    const fs = tree();
    expect(fs.findFirst(/\.never$/)).toBeNull();
  });
});
