import type { FastifyError, FastifyInstance } from 'fastify';
import { FileSystemError } from '@ims/core';
import type { ErrorResponse } from '@ims/shared';

const STATUS: Record<string, number> = {
  NotFoundError: 404,
  AlreadyExistsError: 409,
  DirectoryNotEmptyError: 409,
  NotADirectoryError: 400,
  NotAFileError: 400,
  InvalidPathError: 400,
  InvalidOperationError: 400,
  PermissionDeniedError: 403,
  UserNotFoundError: 404,
  GroupNotFoundError: 404,
};

function isFastifyValidationError(err: unknown): err is FastifyError {
  return (
    typeof err === 'object' && err !== null && 'validation' in err && Array.isArray(err.validation)
  );
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof FileSystemError) {
      const status = STATUS[err.name] ?? 500;
      const body: ErrorResponse = { error: err.name, message: err.message };
      return reply.status(status).send(body);
    }
    if (isFastifyValidationError(err)) {
      const body: ErrorResponse = { error: 'InvalidRequestError', message: err.message };
      return reply.status(400).send(body);
    }
    app.log.error(err);
    const body: ErrorResponse = { error: 'InternalError', message: 'Internal server error' };
    return reply.status(500).send(body);
  });
}
