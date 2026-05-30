import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { FileSystem } from '@ims/core';
import type { EntrySummary, ListEntriesResponse, StatResponse } from '@ims/shared';
import { absolutePathSchema } from './schemas';

interface PathQuery {
  path: string;
}

const pathQuerySchema = {
  type: 'object',
  required: ['path'],
  properties: { path: absolutePathSchema },
} as const;

export function entriesRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions & { fs: FileSystem },
): void {
  const { fs } = opts;

  app.get<{ Querystring: PathQuery }>(
    '/api/entries',
    { schema: { querystring: pathQuerySchema } },
    (req): ListEntriesResponse => {
      const entries: EntrySummary[] = fs.entries(req.query.path);
      return { path: req.query.path, entries };
    },
  );

  app.get<{ Querystring: PathQuery }>(
    '/api/entries/stat',
    { schema: { querystring: pathQuerySchema } },
    (req): StatResponse => {
      const path = req.query.path;
      if (path === '/') {
        return { path: '/', name: '', kind: 'directory' };
      }
      const name = path.split('/').pop() ?? '';
      const list = fs.entries(parentOf(path));
      const found = list.find((e) => e.name === name);
      if (!found) {
        // If it's actually a file, fs.entries on its parent already found it;
        // if not, this branch means the parent listed it incorrectly.
        // Resolve directly: fs.readFile will throw NotFoundError or NotAFileError.
        fs.readFile(path); // throws NotFoundError if missing
        return { path, name, kind: 'file' };
      }
      return { path, name, kind: found.kind };
    },
  );

  app.delete<{ Querystring: { path: string; recursive?: string } }>(
    '/api/entries',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['path'],
          properties: {
            path: absolutePathSchema,
            recursive: { type: 'string', enum: ['true', 'false'] },
          },
        },
      },
    },
    (req, reply) => {
      const recursive = req.query.recursive === 'true';
      fs.remove(req.query.path, { recursive });
      reply.status(204);
      return null;
    },
  );
}

function parentOf(path: string): string {
  if (path === '/') return '/';
  const trimmed = path.endsWith('/') ? path.slice(0, -1) : path;
  const idx = trimmed.lastIndexOf('/');
  return idx === 0 ? '/' : trimmed.slice(0, idx);
}
