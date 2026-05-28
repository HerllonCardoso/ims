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
});
