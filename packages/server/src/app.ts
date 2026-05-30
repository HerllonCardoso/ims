import path from 'node:path';
import fs from 'node:fs';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
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
  staticDir?: string;
}

export interface BuiltApp {
  app: FastifyInstance;
  fs: FileSystem;
}

export async function buildApp(opts: BuildAppOptions = {}): Promise<BuiltApp> {
  const filesystem = opts.fs ?? new FileSystem();
  const app = Fastify({ logger: opts.logger ?? false });

  registerErrorHandler(app);

  app.get('/api/health', () => ({ ok: true }));
  await app.register(entriesRoutes, { fs: filesystem });
  await app.register(dirsRoutes, { fs: filesystem });
  await app.register(filesRoutes, { fs: filesystem });
  await app.register(moveCopyRoutes, { fs: filesystem });
  await app.register(findRoutes, { fs: filesystem });
  await app.register(treeRoutes, { fs: filesystem });

  if (opts.staticDir && fs.existsSync(opts.staticDir)) {
    await app.register(fastifyStatic, {
      root: opts.staticDir,
      prefix: '/',
      wildcard: false,
    });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api')) {
        return reply
          .status(404)
          .send({ error: 'NotFoundError', message: `Route not found: ${req.url}` });
      }
      return reply.sendFile('index.html');
    });
  } else {
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api')) {
        return reply
          .status(404)
          .send({ error: 'NotFoundError', message: `Route not found: ${req.url}` });
      }
      return reply.status(404).send();
    });
  }

  return { app, fs: filesystem };
}

export const defaultStaticDir = path.resolve(__dirname, 'public');
