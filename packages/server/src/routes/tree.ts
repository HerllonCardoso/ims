import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { FileSystem } from '@ims/core';
import type { TreeNode, TreeResponse } from '@ims/shared';

export function treeRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions & { fs: FileSystem },
): void {
  const { fs } = opts;

  app.get<{ Querystring: { path: string; depth?: number } }>(
    '/api/tree',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['path'],
          properties: {
            path: { type: 'string', minLength: 1 },
            depth: { type: 'integer', minimum: 0, maximum: 64 },
          },
        },
      },
    },
    (req): TreeResponse => {
      const depth = req.query.depth ?? 1;
      const rootPath = req.query.path;
      const root = buildSubtree(fs, rootPath, depth);
      return { root };
    },
  );
}

function buildSubtree(fs: FileSystem, path: string, depth: number): TreeNode {
  const name = path === '/' ? '' : (path.split('/').pop() ?? '');
  const node: TreeNode = { name, path, kind: 'directory' };
  if (depth <= 0) return node;
  const entries = fs.entries(path);
  node.children = entries.map((e) => {
    const childPath = path === '/' ? `/${e.name}` : `${path}/${e.name}`;
    if (e.kind === 'directory') {
      return buildSubtree(fs, childPath, depth - 1);
    }
    return { name: e.name, path: childPath, kind: 'file' };
  });
  return node;
}
