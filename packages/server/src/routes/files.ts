import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { FileSystem } from '@ims/core';
import type { CreateRequest, CreateResponse } from '@ims/shared';

const createSchema = {
  type: 'object',
  required: ['path'],
  properties: {
    path: { type: 'string', minLength: 1 },
    recursive: { type: 'boolean' },
  },
  additionalProperties: false,
} as const;

export function filesRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions & { fs: FileSystem },
): void {
  const { fs } = opts;
  app.post<{ Body: CreateRequest }>(
    '/api/files',
    { schema: { body: createSchema } },
    (req, reply): CreateResponse => {
      fs.createFile(req.body.path, { recursive: req.body.recursive });
      reply.status(201);
      return { path: req.body.path };
    },
  );
}
