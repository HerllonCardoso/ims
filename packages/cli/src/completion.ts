import { FileSystemError, type FileSystem } from '@ims/core';

const COMMANDS = [
  'cat',
  'cd',
  'cp',
  'exit',
  'find',
  'findFirst',
  'help',
  'ls',
  'mkdir',
  'mv',
  'pwd',
  'rmdir',
  'touch',
  'tree',
  'walk',
  'write',
] as const;

const PATH_ARG_COUNT: Record<string, number> = {
  cd: 1,
  ls: 1,
  mkdir: 1,
  rmdir: 1,
  touch: 1,
  write: 1,
  cat: 1,
  mv: 2,
  cp: 2,
  tree: 1,
  walk: 1,
};

export function complete(fs: FileSystem, line: string): [string[], string] {
  const endsWithSpace = /\s$/.test(line);
  const tokens = line.split(/\s+/).filter((t) => t.length > 0);

  if (tokens.length === 0 || (tokens.length === 1 && !endsWithSpace)) {
    const prefix = tokens[0] ?? '';
    return [COMMANDS.filter((c) => c.startsWith(prefix)), prefix];
  }

  const command = tokens[0];
  const argTokens = tokens.slice(1).filter((t) => !t.startsWith('-'));
  const partial = endsWithSpace ? '' : (argTokens[argTokens.length - 1] ?? '');
  const slot = endsWithSpace ? argTokens.length : Math.max(0, argTokens.length - 1);

  const maxPathSlots = PATH_ARG_COUNT[command];
  if (!maxPathSlots || slot >= maxPathSlots) {
    return [[], partial];
  }

  return completePath(fs, partial);
}

function completePath(fs: FileSystem, partial: string): [string[], string] {
  const slash = partial.lastIndexOf('/');
  const dirPath = slash === -1 ? undefined : slash === 0 ? '/' : partial.slice(0, slash);
  const leafPrefix = slash === -1 ? partial : partial.slice(slash + 1);

  let entries: Array<{ name: string; kind: 'file' | 'directory' }>;
  try {
    entries = fs.entries(dirPath);
  } catch (e) {
    if (e instanceof FileSystemError) return [[], leafPrefix];
    throw e;
  }

  const matches = entries
    .filter((e) => e.name.startsWith(leafPrefix))
    .map((e) => (e.kind === 'directory' ? `${e.name}/` : e.name));
  return [matches, leafPrefix];
}
