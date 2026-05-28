import { FileSystem } from '../src/core/filesystem';
import {
  AlreadyExistsError,
  DirectoryNotEmptyError,
  InvalidOperationError,
  InvalidPathError,
  NotADirectoryError,
  NotFoundError,
} from '../src/core/errors';

describe('FileSystem — pwd & cd', () => {
  it('starts at the root', () => {
    const fs = new FileSystem();
    expect(fs.pwd()).toBe('/');
  });

  it('cd("/") stays at root', () => {
    const fs = new FileSystem();
    fs.cd('/');
    expect(fs.pwd()).toBe('/');
  });

  it('cd to a missing path throws NotFoundError', () => {
    const fs = new FileSystem();
    expect(() => fs.cd('nope')).toThrow(NotFoundError);
  });

  it('cd("") throws InvalidPathError', () => {
    const fs = new FileSystem();
    expect(() => fs.cd('')).toThrow(InvalidPathError);
  });

  it('".." at root stays at root', () => {
    const fs = new FileSystem();
    fs.cd('..');
    expect(fs.pwd()).toBe('/');
  });
});

describe('FileSystem — directories', () => {
  it('mkdir creates a directory under cwd', () => {
    const fs = new FileSystem();
    fs.mkdir('school');
    expect(fs.ls()).toEqual(['school']);
  });

  it('ls returns children sorted alphabetically', () => {
    const fs = new FileSystem();
    fs.mkdir('history');
    fs.mkdir('math');
    fs.mkdir('spanish');
    expect(fs.ls()).toEqual(['history', 'math', 'spanish']);
  });

  it('mkdir of an existing name throws AlreadyExistsError', () => {
    const fs = new FileSystem();
    fs.mkdir('a');
    expect(() => fs.mkdir('a')).toThrow(AlreadyExistsError);
  });

  it('mkdir without recursive errors on missing intermediates', () => {
    const fs = new FileSystem();
    expect(() => fs.mkdir('a/b/c')).toThrow(NotFoundError);
  });

  it('rmdir removes an empty directory', () => {
    const fs = new FileSystem();
    fs.mkdir('lunch');
    fs.rmdir('lunch');
    expect(fs.ls()).toEqual([]);
  });

  it('rmdir on a non-empty directory throws DirectoryNotEmptyError', () => {
    const fs = new FileSystem();
    fs.mkdir('a');
    fs.cd('a');
    fs.mkdir('b');
    fs.cd('..');
    expect(() => fs.rmdir('a')).toThrow(DirectoryNotEmptyError);
  });

  it('rmdir({recursive:true}) removes a non-empty directory', () => {
    const fs = new FileSystem();
    fs.mkdir('a');
    fs.cd('a');
    fs.mkdir('b');
    fs.cd('..');
    fs.rmdir('a', { recursive: true });
    expect(fs.ls()).toEqual([]);
  });

  it('mkdir({recursive:true}) on an existing directory returns it (idempotent)', () => {
    const fs = new FileSystem();
    const first = fs.mkdir('a');
    const again = fs.mkdir('a', { recursive: true });
    expect(again).toBe(first);
  });

  it('rmdir("/") throws InvalidOperationError', () => {
    const fs = new FileSystem();
    expect(() => fs.rmdir('/')).toThrow(InvalidOperationError);
  });

  it('rmdir("..") at root throws InvalidOperationError', () => {
    const fs = new FileSystem();
    expect(() => fs.rmdir('..')).toThrow(InvalidOperationError);
  });

  it('walks the worked example end-to-end', () => {
    const fs = new FileSystem();
    fs.mkdir('school');
    fs.cd('school');
    expect(fs.pwd()).toBe('/school');
    fs.mkdir('homework');
    fs.cd('homework');
    fs.mkdir('math');
    fs.mkdir('lunch');
    fs.mkdir('history');
    fs.mkdir('spanish');
    fs.rmdir('lunch');
    expect(fs.ls()).toEqual(['history', 'math', 'spanish']);
    expect(fs.pwd()).toBe('/school/homework');
    fs.cd('..');
    fs.mkdir('cheatsheet');
    expect(fs.ls()).toEqual(['cheatsheet', 'homework']);
    fs.rmdir('cheatsheet');
    fs.cd('..');
    expect(fs.pwd()).toBe('/');
  });
});
