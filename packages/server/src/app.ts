import Fastify, { type FastifyInstance } from 'fastify';
import { FileSystem } from '@ims/core';
import { registerErrorHandler } from './errors';
import { entriesRoutes } from './routes/entries';

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
  app.get('/api/health', () => ({ ok: true }));
  void app.register(entriesRoutes, { fs });
  registerErrorHandler(app);
  return { app, fs };
}
