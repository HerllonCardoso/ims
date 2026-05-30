import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { FileSystem } from '@ims/core';
import type { MoveCopyRequest, MoveCopyResponse } from '@ims/shared';

const moveCopySchema = {
  type: 'object',
  required: ['src', 'dest'],
  properties: {
    src: { type: 'string', minLength: 1 },
    dest: { type: 'string', minLength: 1 },
    onConflict: { type: 'string', enum: ['error', 'overwrite', 'rename'] },
    recursive: { type: 'boolean' },
  },
  additionalProperties: false,
} as const;

export function moveCopyRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions & { fs: FileSystem },
): void {
  const { fs } = opts;

  app.post<{ Body: MoveCopyRequest }>(
    '/api/move',
    { schema: { body: moveCopySchema } },
    (req): MoveCopyResponse => {
      fs.move(req.body.src, req.body.dest, {
        onConflict: req.body.onConflict,
        recursive: req.body.recursive,
      });
      return { src: req.body.src, dest: req.body.dest };
    },
  );

  app.post<{ Body: MoveCopyRequest }>(
    '/api/copy',
    { schema: { body: moveCopySchema } },
    (req): MoveCopyResponse => {
      fs.copy(req.body.src, req.body.dest, {
        onConflict: req.body.onConflict,
        recursive: req.body.recursive,
      });
      return { src: req.body.src, dest: req.body.dest };
    },
  );
}
