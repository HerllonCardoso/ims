import { FileSystem } from '../src/core/filesystem';
import { runCommand } from '../src/cli/commands';

describe('CLI command dispatcher', () => {
  it('runs the worked example end-to-end', () => {
    const fs = new FileSystem();
    const out: string[] = [];
    const print = (s: string) => out.push(s);
    const lines = [
      'mkdir school',
      'cd school',
      'pwd',
      'mkdir homework',
      'cd homework',
      'mkdir math',
      'mkdir lunch',
      'mkdir history',
      'mkdir spanish',
      'rmdir lunch',
      'ls',
      'pwd',
      'cd ..',
      'mkdir cheatsheet',
      'ls',
      'rmdir cheatsheet',
      'cd ..',
      'pwd',
    ];
    for (const line of lines) runCommand(fs, line, print);
    expect(out).toEqual([
      '/school',
      'history  math  spanish',
      '/school/homework',
      'cheatsheet  homework',
      '/',
    ]);
  });

  it('supports mkdir -p', () => {
    const fs = new FileSystem();
    const out: string[] = [];
    runCommand(fs, 'mkdir -p a/b/c', (s) => out.push(s));
    runCommand(fs, 'pwd', (s) => out.push(s));
    runCommand(fs, 'ls /a/b', (s) => out.push(s));
    expect(out).toEqual(['/', 'c']);
  });

  it('supports touch + write + cat', () => {
    const fs = new FileSystem();
    const out: string[] = [];
    runCommand(fs, 'touch a.txt', (s) => out.push(s));
    runCommand(fs, 'write a.txt hello world', (s) => out.push(s));
    runCommand(fs, 'cat a.txt', (s) => out.push(s));
    expect(out).toEqual(['hello world']);
  });

  it('prints friendly error messages for FileSystemError', () => {
    const fs = new FileSystem();
    const out: string[] = [];
    runCommand(fs, 'cd nope', (s) => out.push(s));
    expect(out[0]).toMatch(/No such file or directory/);
  });

  it('write captures multi-token content correctly even when the path equals the command', () => {
    const fs = new FileSystem();
    const out: string[] = [];
    runCommand(fs, 'touch write', (s) => out.push(s));
    runCommand(fs, 'write write hello there', (s) => out.push(s));
    runCommand(fs, 'cat write', (s) => out.push(s));
    expect(out).toEqual(['hello there']);
  });

  it('prints a usage message when required argument is missing', () => {
    const fs = new FileSystem();
    const out: string[] = [];
    runCommand(fs, 'cd', (s) => out.push(s));
    expect(out[0]).toMatch(/Usage: cd <path>/);
  });

  it('touch -p auto-creates intermediate directories', () => {
    const fs = new FileSystem();
    const out: string[] = [];
    runCommand(fs, 'touch -p /a/b/c.txt', (s) => out.push(s));
    runCommand(fs, 'ls /a/b', (s) => out.push(s));
    expect(out).toEqual(['c.txt']);
  });

  it('mv -p auto-creates intermediate destination directories', () => {
    const fs = new FileSystem();
    const out: string[] = [];
    runCommand(fs, 'touch a.txt', (s) => out.push(s));
    runCommand(fs, 'write a.txt hi', (s) => out.push(s));
    runCommand(fs, 'mv -p a.txt /new/sub/b.txt', (s) => out.push(s));
    runCommand(fs, 'cat /new/sub/b.txt', (s) => out.push(s));
    expect(out).toEqual(['hi']);
  });

  it('cp -p auto-creates intermediate destination directories', () => {
    const fs = new FileSystem();
    const out: string[] = [];
    runCommand(fs, 'touch a.txt', (s) => out.push(s));
    runCommand(fs, 'write a.txt hi', (s) => out.push(s));
    runCommand(fs, 'cp -p a.txt /new/sub/b.txt', (s) => out.push(s));
    runCommand(fs, 'cat /new/sub/b.txt', (s) => out.push(s));
    runCommand(fs, 'cat a.txt', (s) => out.push(s));
    expect(out).toEqual(['hi', 'hi']);
  });

  it('findFirst exposes the regex search in the CLI', () => {
    const fs = new FileSystem();
    const out: string[] = [];
    runCommand(fs, 'mkdir -p a/b', (s) => out.push(s));
    runCommand(fs, 'touch /a/b/notes.log', (s) => out.push(s));
    runCommand(fs, 'findFirst \\.log$', (s) => out.push(s));
    expect(out).toEqual(['/a/b/notes.log']);
  });

  it('mv with rename policy in the CLI', () => {
    const fs = new FileSystem();
    const out: string[] = [];
    runCommand(fs, 'mkdir dest', (s) => out.push(s));
    runCommand(fs, 'touch dest/x.txt', (s) => out.push(s));
    runCommand(fs, 'touch x.txt', (s) => out.push(s));
    runCommand(fs, 'mv -n x.txt dest', (s) => out.push(s));
    runCommand(fs, 'ls dest', (s) => out.push(s));
    expect(out[out.length - 1]).toBe('x (1).txt  x.txt');
  });
});
