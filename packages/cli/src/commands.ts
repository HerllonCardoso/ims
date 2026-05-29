import {
  FileSystem,
  FileSystemError,
  type ConflictPolicy,
  type PermissionUpdate,
  type WalkVisitor,
} from '@ims/core';

type Print = (line: string) => void;

interface Parsed {
  command: string;
  flags: Set<string>;
  args: string[];
  rest: string; // everything after `command [flags] arg1` joined — used by `write`
}

function parse(line: string): Parsed {
  const tokens = tokenize(line.trim());
  const command = tokens.shift() ?? '';
  const flags = new Set<string>();
  while (tokens[0]?.startsWith('-')) {
    for (const ch of tokens.shift()!.slice(1)) flags.add(ch);
  }
  const args = [...tokens];
  // For commands that take "<path> <content...>" (like `write`), `rest` is the tail
  // after the first argument joined back with spaces. Whitespace within unquoted content
  // is collapsed to a single space, keeping the REPL parser intentionally small.
  const rest = args.slice(1).join(' ');
  return { command, flags, args, rest };
}

function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let tokenStarted = false;

  const push = () => {
    if (tokenStarted) tokens.push(current);
    current = '';
    tokenStarted = false;
  };

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (quote) {
      if (ch === quote) {
        quote = null;
      } else if (ch === '\\' && quote === '"' && i + 1 < line.length) {
        current += line[++i];
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      tokenStarted = true;
    } else if (/\s/.test(ch)) {
      push();
    } else {
      current += ch;
      tokenStarted = true;
    }
  }

  if (quote) throw new Error(`Unclosed quote: ${quote}`);
  push();
  return tokens;
}

export function runCommand(fs: FileSystem, line: string, print: Print): void {
  const { command, flags, args, rest } = parse(line);
  if (!command) return;
  try {
    switch (command) {
      case 'pwd':
        return print(fs.pwd());
      case 'cd':
        return fs.cd(required(args[0], 'cd <path>'));
      case 'ls': {
        const items = fs.ls(args[0]);
        return print(items.join('  '));
      }
      case 'mkdir':
        return void fs.mkdir(required(args[0], 'mkdir <path>'), { recursive: flags.has('p') });
      case 'rmdir':
        return fs.rmdir(required(args[0], 'rmdir <path>'), { recursive: flags.has('r') });
      case 'touch':
        return void fs.createFile(required(args[0], 'touch <path>'), { recursive: flags.has('p') });
      case 'write':
        return fs.writeFile(required(args[0], 'write <path> <content>'), rest);
      case 'cat':
        return print(fs.readFile(required(args[0], 'cat <path>')));
      case 'mv':
        return fs.move(required(args[0], 'mv <src> <dest>'), required(args[1], 'mv <src> <dest>'), {
          onConflict: conflictFromFlags(flags),
          recursive: flags.has('p'),
        });
      case 'cp':
        return fs.copy(required(args[0], 'cp <src> <dest>'), required(args[1], 'cp <src> <dest>'), {
          onConflict: conflictFromFlags(flags),
          recursive: flags.has('p'),
        });
      case 'find': {
        const hits = fs.find(required(args[0], 'find <name>'));
        if (hits.length > 0) print(hits.join('\n'));
        return;
      }
      case 'findFirst': {
        const pattern = required(args[0], 'findFirst <regex>');
        const hit = fs.findFirst(new RegExp(pattern));
        if (hit !== null) print(hit);
        return;
      }
      case 'tree':
        return printTree(fs, args[0] ?? fs.pwd(), print);
      case 'walk': {
        const collected: string[] = [];
        const v: WalkVisitor = (_n, p) => void collected.push(p);
        fs.walk(args[0] ?? fs.pwd(), v);
        return print(collected.join('\n'));
      }
      case 'useradd':
        return fs.createUser(required(args[0], 'useradd <user>'));
      case 'groupadd':
        return fs.createGroup(required(args[0], 'groupadd <group>'));
      case 'usermod':
        if (!flags.has('a') || !flags.has('G')) {
          throw new Error('Usage: usermod -aG <group> <user>');
        }
        return fs.addUserToGroup(
          required(args[1], 'usermod -aG <group> <user>'),
          required(args[0], 'usermod -aG <group> <user>'),
        );
      case 'su':
        return fs.switchUser(required(args[0], 'su <user>'));
      case 'whoami':
        return print(fs.currentUser());
      case 'grant':
        return applyGrant(fs, args);
      case 'revoke':
        return applyRevoke(fs, args);
      case 'help':
        return print(HELP);
      default:
        return print(`Unknown command: ${command} (try 'help')`);
    }
  } catch (err) {
    if (err instanceof FileSystemError) return print(`${err.name}: ${err.message}`);
    if (err instanceof Error) return print(err.message);
    throw err;
  }
}

function required(arg: string | undefined, usage: string): string {
  if (!arg) throw new Error(`Usage: ${usage}`);
  return arg;
}

function conflictFromFlags(flags: Set<string>): ConflictPolicy {
  if (flags.has('f')) return 'overwrite';
  if (flags.has('n')) return 'rename';
  return 'error';
}

function parsePermissions(input: string | undefined): PermissionUpdate {
  const token = required(input, 'grant <user|group> <name> <r|w|rw|none> <path>');
  if (token === 'none') return {};
  if (!/^[rw]+$/.test(token)) {
    throw new Error('Permissions must be one of: r, w, rw, none');
  }
  return {
    read: token.includes('r'),
    write: token.includes('w'),
  };
}

function applyGrant(fs: FileSystem, args: string[]): void {
  const target = required(args[0], 'grant <user|group> <name> <r|w|rw|none> <path>');
  const name = required(args[1], 'grant <user|group> <name> <r|w|rw|none> <path>');
  const permissions = parsePermissions(args[2]);
  const path = required(args[3], 'grant <user|group> <name> <r|w|rw|none> <path>');
  if (target === 'user') return fs.grantUser(path, name, permissions);
  if (target === 'group') return fs.grantGroup(path, name, permissions);
  throw new Error('Usage: grant <user|group> <name> <r|w|rw|none> <path>');
}

function applyRevoke(fs: FileSystem, args: string[]): void {
  const target = required(args[0], 'revoke <user|group> <name> <path>');
  const name = required(args[1], 'revoke <user|group> <name> <path>');
  const path = required(args[2], 'revoke <user|group> <name> <path>');
  if (target === 'user') return fs.revokeUser(path, name);
  if (target === 'group') return fs.revokeGroup(path, name);
  throw new Error('Usage: revoke <user|group> <name> <path>');
}

function printTree(fs: FileSystem, path: string, print: Print): void {
  const lines: string[] = [];
  fs.walk(path, (node, p) => {
    const depth = p === '/' ? 0 : p.split('/').length - 1;
    const indent = '  '.repeat(Math.max(0, depth - 1));
    const label = p === '/' ? '/' : node.name + (node.kind === 'directory' ? '/' : '');
    lines.push(`${indent}${label}`);
  });
  print(lines.join('\n'));
}

const HELP = [
  'Commands:',
  '  pwd                       print working directory',
  '  cd <path>                 change directory',
  '  ls [path]                 list directory contents',
  '  mkdir [-p] <path>         make directory (-p creates intermediates)',
  '  rmdir [-r] <path>         remove directory (-r recursive)',
  '  touch [-p] <path>              create empty file (-p creates intermediate dirs)',
  '  write <path> <content>         write contents to existing file',
  '  cat <path>                     print file contents',
  '  mv [-f|-n] [-p] <src> <dest>   move/rename (-f overwrite, -n rename, -p create dest parents)',
  '  cp [-f|-n] [-p] <src> <dest>   copy (-f overwrite, -n rename, -p create dest parents)',
  '  find <name>                    find every match by exact name in subtree',
  '  findFirst <regex>              find first descendant whose name matches the regex',
  '  tree [path]               pretty-print subtree',
  '  walk [path]               list every descendant path',
  '  useradd <user>                 create a user',
  '  groupadd <group>               create a group',
  '  usermod -aG <group> <user>     add a user to a group',
  '  su <user>                      switch current user',
  '  whoami                         print current user',
  '  grant <user|group> <name> <r|w|rw|none> <path>',
  '  revoke <user|group> <name> <path>',
  '  help                      show this message',
  '  exit                      leave the REPL',
].join('\n');
