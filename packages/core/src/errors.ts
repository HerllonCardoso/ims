export class FileSystemError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class InvalidPathError extends FileSystemError {}
export class NotFoundError extends FileSystemError {}
export class NotADirectoryError extends FileSystemError {}
export class NotAFileError extends FileSystemError {}
export class AlreadyExistsError extends FileSystemError {}
export class DirectoryNotEmptyError extends FileSystemError {}
export class InvalidOperationError extends FileSystemError {}
export class PermissionDeniedError extends FileSystemError {}
export class UserNotFoundError extends FileSystemError {}
export class GroupNotFoundError extends FileSystemError {}
