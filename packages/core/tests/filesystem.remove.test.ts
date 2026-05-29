import { FileSystem } from '../src';
import {
  DirectoryNotEmptyError,
  InvalidOperationError,
  NotFoundError,
} from '../src/errors';

describe('FileSystem.remove', () => {
  it('removes a file', () => {
    const fs = new FileSystem();
    fs.createFile('/a.txt');
    fs.remove('/a.txt');
    expect(() => fs.remove('/a.txt')).toThrow(NotFoundError);
    expect(fs.ls('/')).not.toContain('a.txt');
  });

  it('removes an empty directory', () => {
    const fs = new FileSystem();
    fs.mkdir('/d');
    fs.remove('/d');
    expect(fs.ls('/')).not.toContain('d');
  });

  it('refuses non-empty directory without recursive', () => {
    const fs = new FileSystem();
    fs.mkdir('/d');
    fs.createFile('/d/a.txt');
    expect(() => fs.remove('/d')).toThrow(DirectoryNotEmptyError);
  });

  it('removes non-empty directory with recursive', () => {
    const fs = new FileSystem();
    fs.mkdir('/d');
    fs.createFile('/d/a.txt');
    fs.remove('/d', { recursive: true });
    expect(fs.ls('/')).not.toContain('d');
  });

  it('reparents cwd if it lives inside the removed subtree', () => {
    const fs = new FileSystem();
    fs.mkdir('/p');
    fs.mkdir('/p/child');
    fs.cd('/p/child');
    fs.remove('/p', { recursive: true });
    expect(fs.pwd()).toBe('/');
  });

  it('throws InvalidOperationError on root', () => {
    const fs = new FileSystem();
    expect(() => fs.remove('/')).toThrow(InvalidOperationError);
  });

  it('throws NotFoundError on missing path', () => {
    const fs = new FileSystem();
    expect(() => fs.remove('/nope')).toThrow(NotFoundError);
  });
});
