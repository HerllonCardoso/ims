import { FileSystem } from '@ims/core';
import { complete } from '../src/completion';

function setup(): FileSystem {
  const fs = new FileSystem();
  fs.mkdir('school');
  fs.mkdir('shop');
  fs.createFile('notes.txt');
  fs.mkdir('/school/homework', { recursive: true });
  fs.mkdir('/school/history', { recursive: true });
  fs.createFile('/school/syllabus.pdf');
  return fs;
}

describe('REPL tab completion', () => {
  describe('command names', () => {
    it('empty line lists every command', () => {
      const [matches, prefix] = complete(new FileSystem(), '');
      expect(prefix).toBe('');
      expect(matches).toContain('pwd');
      expect(matches).toContain('mkdir');
      expect(matches).toContain('findFirst');
    });

    it('prefix narrows the command list', () => {
      const [matches, prefix] = complete(new FileSystem(), 'c');
      expect(prefix).toBe('c');
      expect(matches.sort()).toEqual(['cat', 'cd', 'cp']);
    });

    it('unique prefix returns one match', () => {
      const [matches] = complete(new FileSystem(), 'mk');
      expect(matches).toEqual(['mkdir']);
    });
  });

  describe('path arguments', () => {
    it('completes cwd children after "cd " (alphabetical, dirs get trailing /)', () => {
      const fs = setup();
      const [matches, prefix] = complete(fs, 'cd ');
      expect(prefix).toBe('');
      expect(matches).toEqual(['notes.txt', 'school/', 'shop/']);
    });

    it('filters by leaf prefix', () => {
      const fs = setup();
      const [matches, prefix] = complete(fs, 'cd s');
      expect(prefix).toBe('s');
      expect(matches.sort()).toEqual(['school/', 'shop/']);
    });

    it('completes inside an absolute path', () => {
      const fs = setup();
      const [matches, prefix] = complete(fs, 'cd /school/h');
      expect(prefix).toBe('h');
      expect(matches.sort()).toEqual(['history/', 'homework/']);
    });

    it('lists contents when partial ends in /', () => {
      const fs = setup();
      const [matches, prefix] = complete(fs, 'cat /school/');
      expect(prefix).toBe('');
      expect(matches).toEqual(['history/', 'homework/', 'syllabus.pdf']);
    });

    it('returns nothing for a non-existent directory', () => {
      const fs = setup();
      const [matches] = complete(fs, 'cd /nope/x');
      expect(matches).toEqual([]);
    });
  });

  describe('arg slot limits', () => {
    it('mv completes both src and dest', () => {
      const fs = setup();
      const [srcMatches] = complete(fs, 'mv s');
      expect(srcMatches.sort()).toEqual(['school/', 'shop/']);
      const [destMatches] = complete(fs, 'mv school s');
      expect(destMatches.sort()).toEqual(['school/', 'shop/']);
    });

    it('mv does not complete a third positional arg', () => {
      const fs = setup();
      const [matches] = complete(fs, 'mv school shop x');
      expect(matches).toEqual([]);
    });

    it('write completes the path but not content', () => {
      const fs = setup();
      const [pathMatches] = complete(fs, 'write n');
      expect(pathMatches).toEqual(['notes.txt']);
      const [contentMatches] = complete(fs, 'write notes.txt hel');
      expect(contentMatches).toEqual([]);
    });

    it('find and findFirst do not complete (name/regex, not a path)', () => {
      const fs = setup();
      expect(complete(fs, 'find s')[0]).toEqual([]);
      expect(complete(fs, 'findFirst sch')[0]).toEqual([]);
    });

    it('pwd / help / exit get no arg completion', () => {
      const fs = setup();
      expect(complete(fs, 'pwd ')[0]).toEqual([]);
      expect(complete(fs, 'help ')[0]).toEqual([]);
      expect(complete(fs, 'exit ')[0]).toEqual([]);
    });
  });

  describe('flags', () => {
    it('skips over flags when counting positional args', () => {
      const fs = setup();
      const [matches] = complete(fs, 'mkdir -p s');
      expect(matches.sort()).toEqual(['school/', 'shop/']);
    });

    it('handles multiple flags before the path', () => {
      const fs = setup();
      const [matches] = complete(fs, 'mv -f -p s');
      expect(matches.sort()).toEqual(['school/', 'shop/']);
    });
  });
});
