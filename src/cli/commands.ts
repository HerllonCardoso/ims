import { FileSystem, WalkVisitor } from '../core/filesystem';
import { FsNode } from '../core/nodes';
import { FileSystemError } from '../core/errors';
import { ConflictPolicy } from '../core/conflicts';

type Print = (line: string) => void;

interface Parsed {
  command: string;
  flags: Set<string>;
  args: string[];
  rest: string; // everything after `command [flags] arg1` joined — used by `write`
}

function parse(line: string): Parsed {
  const tokens = line.trim().split(/\s+/);
  const command = tokens.shift() ?? '';
  const flags = new Set<string>();
  while (tokens[0]?.startsWith('-')) {
    for (const ch of tokens.shift()!.slice(1)) flags.add(ch);
  }
  const args = [...tokens];
  // For commands that take "<path> <content...>" (like `write`), `rest` is the tail
  // after the first argument joined back with spaces. Whitespace within the content is
  // collapsed to a single space — acceptable for a take-home REPL without quoted strings.
  const rest = args.slice(1).join(' ');
  return { command, flags, args, rest };
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
        return void fs.createFile(required(args[0], 'touch <path>'));
      case 'write':
        return fs.writeFile(required(args[0], 'write <path> <content>'), rest);
      case 'cat':
        return print(fs.readFile(required(args[0], 'cat <path>')));
      case 'mv':
        return fs.move(
          required(args[0], 'mv <src> <dest>'),
          required(args[1], 'mv <src> <dest>'),
          { onConflict: conflictFromFlags(flags) },
        );
      case 'cp':
        return fs.copy(
          required(args[0], 'cp <src> <dest>'),
          required(args[1], 'cp <src> <dest>'),
          { onConflict: conflictFromFlags(flags) },
        );
      case 'find': {
        const hits = fs.find(required(args[0], 'find <name>'));
        return print(hits.join('\n'));
      }
      case 'tree':
        return printTree(fs, args[0] ?? fs.pwd(), print);
      case 'walk': {
        const collected: string[] = [];
        const v: WalkVisitor = (_n: FsNode, p: string) => void collected.push(p);
        fs.walk(args[0] ?? fs.pwd(), v);
        return print(collected.join('\n'));
      }
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
  '  touch <path>              create empty file',
  '  write <path> <content>    write contents to existing file',
  '  cat <path>                print file contents',
  '  mv [-f|-n] <src> <dest>   move/rename (-f overwrite, -n rename on collision)',
  '  cp [-f|-n] <src> <dest>   copy (-f overwrite, -n rename on collision)',
  '  find <name>               find every match by exact name in subtree',
  '  tree [path]               pretty-print subtree',
  '  walk [path]               list every descendant path',
  '  help                      show this message',
  '  exit                      leave the REPL',
].join('\n');
