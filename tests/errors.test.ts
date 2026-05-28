import {
  FileSystemError,
  InvalidPathError,
  NotFoundError,
  NotADirectoryError,
  NotAFileError,
  AlreadyExistsError,
  DirectoryNotEmptyError,
  InvalidOperationError,
} from '../src/core/errors';

describe('FileSystemError hierarchy', () => {
  const cases: Array<[new (m: string) => FileSystemError, string]> = [
    [InvalidPathError, 'InvalidPathError'],
    [NotFoundError, 'NotFoundError'],
    [NotADirectoryError, 'NotADirectoryError'],
    [NotAFileError, 'NotAFileError'],
    [AlreadyExistsError, 'AlreadyExistsError'],
    [DirectoryNotEmptyError, 'DirectoryNotEmptyError'],
    [InvalidOperationError, 'InvalidOperationError'],
  ];

  it.each(cases)('%p extends FileSystemError and sets name', (Ctor, name) => {
    const err = new Ctor('boom');
    expect(err).toBeInstanceOf(FileSystemError);
    expect(err).toBeInstanceOf(Ctor);
    expect(err.name).toBe(name);
    expect(err.message).toBe('boom');
  });
});

describe('FileSystemError base class', () => {
  it('sets name to "FileSystemError" and propagates message', () => {
    const err = new FileSystemError('base');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('FileSystemError');
    expect(err.message).toBe('base');
  });

  it('propagates the cause option', () => {
    const original = new Error('original');
    const err = new NotFoundError('wrapper', { cause: original });
    expect(err.cause).toBe(original);
  });
});
