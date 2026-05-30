import Fastify, { type FastifyInstance } from 'fastify';
import { FileSystem } from '@ims/core';
import { registerErrorHandler } from './errors';
import { entriesRoutes } from './routes/entries';
import { dirsRoutes } from './routes/dirs';
import { filesRoutes } from './routes/files';
import { moveCopyRoutes } from './routes/move-copy';
import { findRoutes } from './routes/find';
import { treeRoutes } from './routes/tree';

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
  void app.register(dirsRoutes, { fs });
  void app.register(filesRoutes, { fs });
  void app.register(moveCopyRoutes, { fs });
  void app.register(findRoutes, { fs });
  void app.register(treeRoutes, { fs });
  registerErrorHandler(app);
  return { app, fs };
}
