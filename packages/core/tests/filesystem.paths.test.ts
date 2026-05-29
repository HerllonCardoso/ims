import { FileSystem } from '../src/filesystem';
import { NotADirectoryError, NotFoundError } from '../src/errors';

describe('FileSystem — path operations', () => {
  it('mkdir with recursive creates missing intermediates', () => {
    const fs = new FileSystem();
    fs.mkdir('a/b/c', { recursive: true });
    expect(fs.ls('/a')).toEqual(['b']);
    expect(fs.ls('/a/b')).toEqual(['c']);
  });

  it('mkdir without recursive errors on missing intermediates', () => {
    const fs = new FileSystem();
    expect(() => fs.mkdir('a/b/c')).toThrow(NotFoundError);
  });

  it('cd accepts absolute and relative paths', () => {
    const fs = new FileSystem();
    fs.mkdir('a/b/c', { recursive: true });
    fs.cd('/a/b');
    expect(fs.pwd()).toBe('/a/b');
    fs.cd('c');
    expect(fs.pwd()).toBe('/a/b/c');
    fs.cd('../..');
    expect(fs.pwd()).toBe('/a');
  });

  it('".." beyond root stays at root', () => {
    const fs = new FileSystem();
    fs.cd('../../..');
    expect(fs.pwd()).toBe('/');
  });

  it('traversing through a file throws NotADirectoryError', () => {
    const fs = new FileSystem();
    fs.createFile('a.txt');
    expect(() => fs.ls('a.txt/x')).toThrow(NotADirectoryError);
  });

  it('createFile under a path with existing intermediate dirs', () => {
    const fs = new FileSystem();
    fs.mkdir('a/b', { recursive: true });
    fs.createFile('/a/b/c.txt');
    fs.writeFile('/a/b/c.txt', 'hi');
    expect(fs.readFile('/a/b/c.txt')).toBe('hi');
  });

  it('createFile with { recursive: true } auto-creates missing intermediate dirs', () => {
    const fs = new FileSystem();
    fs.createFile('/a/b/c.txt', { recursive: true });
    fs.writeFile('/a/b/c.txt', 'hi');
    expect(fs.readFile('/a/b/c.txt')).toBe('hi');
  });

  it('createFile without recursive errors on missing intermediates', () => {
    const fs = new FileSystem();
    expect(() => fs.createFile('/a/b/c.txt')).toThrow();
  });
});
