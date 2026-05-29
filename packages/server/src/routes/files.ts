import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { FileSystem } from '@ims/core';
import type { CreateRequest, CreateResponse, ReadFileResponse, WriteFileRequest } from '@ims/shared';

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

  app.get<{ Querystring: { path: string } }>(
    '/api/files/content',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['path'],
          properties: { path: { type: 'string', minLength: 1 } },
        },
      },
    },
    (req): ReadFileResponse => {
      const content = fs.readFile(req.query.path);
      return { path: req.query.path, content };
    },
  );

  app.put<{ Body: WriteFileRequest }>(
    '/api/files/content',
    {
      schema: {
        body: {
          type: 'object',
          required: ['path', 'content'],
          properties: {
            path: { type: 'string', minLength: 1 },
            content: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    (req): ReadFileResponse => {
      fs.writeFile(req.body.path, req.body.content);
      return { path: req.body.path, content: req.body.content };
    },
  );
}
