import { ApiError } from './request';

export function isApiErrorCode(error: unknown, status: number, code: string): boolean {
  if (error instanceof ApiError) {
    return error.status === status && error.code === code;
  }
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'code' in error &&
    error.status === status &&
    error.code === code
  );
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return String(error);
}

export function isErrorLike(error: unknown): boolean {
  return (
    error instanceof Error ||
    (typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string')
  );
}
