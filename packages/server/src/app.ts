import Fastify, { type FastifyInstance } from 'fastify';
import { FileSystem } from '@ims/core';
import { registerErrorHandler } from './errors';

export interface BuildAppOptions {
  fs?: FileSystem;
  logger?: boolean;
}

export interface BuiltApp {
  app: FastifyInstance;
  fs: FileSystem;
}

export function buildApp(opts: BuildAppOptions = {}): BuiltApp {
  const fs = opts.fs ?? new FileSystem();
  const app = Fastify({ logger: opts.logger ?? false });
  app.get('/api/health', async () => ({ ok: true }));
  registerErrorHandler(app);
  return { app, fs };
}
