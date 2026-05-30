import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { FileSystem } from '@ims/core';
import type { FindFirstResponse, FindResponse } from '@ims/shared';
import { absolutePathSchema } from './schemas';

export function findRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions & { fs: FileSystem },
): void {
  const { fs } = opts;

  app.get<{ Querystring: { name: string; from?: string } }>(
    '/api/find',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1 },
            from: absolutePathSchema,
          },
        },
      },
    },
    (req): FindResponse => {
      return { matches: fs.find(req.query.name, req.query.from ?? '/') };
    },
  );

  app.get<{ Querystring: { pattern: string; from?: string } }>(
    '/api/find/first',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['pattern'],
          properties: {
            pattern: { type: 'string', minLength: 1 },
            from: absolutePathSchema,
          },
        },
      },
    },
    (req): FindFirstResponse => {
      return { match: fs.findFirst(new RegExp(req.query.pattern), req.query.from ?? '/') };
    },
  );
}
