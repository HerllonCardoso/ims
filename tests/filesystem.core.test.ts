import { FileSystem } from '../src/core/filesystem';
import {
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
