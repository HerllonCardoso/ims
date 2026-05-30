import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { FileSystem } from '@ims/core';
import type { CreateRequest, CreateResponse } from '@ims/shared';
import { absolutePathSchema } from './schemas';

const createSchema = {
  type: 'object',
  required: ['path'],
  properties: {
    path: absolutePathSchema,
    recursive: { type: 'boolean' },
  },
  additionalProperties: false,
} as const;

export function dirsRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions & { fs: FileSystem },
): void {
  const { fs } = opts;
  app.post<{ Body: CreateRequest }>(
    '/api/dirs',
    { schema: { body: createSchema } },
    (req, reply): CreateResponse => {
      fs.mkdir(req.body.path, { recursive: req.body.recursive });
      reply.status(201);
      return { path: req.body.path };
    },
  );
}
