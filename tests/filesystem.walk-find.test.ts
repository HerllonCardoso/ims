import { FileSystem } from '../src/core/filesystem';

function setup(): FileSystem {
  const fs = new FileSystem();
  fs.mkdir('school');
  fs.cd('school');
  fs.mkdir('math');
  fs.cd('math');
  fs.createFile('notes.txt');
  fs.cd('..');
  fs.mkdir('history');
  fs.cd('history');
  fs.createFile('notes.txt');
  fs.cd('/');
  return fs;
}

describe('FileSystem — find', () => {
  it('finds every match by exact name in the subtree of cwd', () => {
    const fs = setup();
    fs.cd('/school');
    expect(fs.find('notes.txt').sort()).toEqual([
      '/school/history/notes.txt',
      '/school/math/notes.txt',
    ]);
  });

  it('returns an empty array when nothing matches', () => {
    const fs = setup();
    expect(fs.find('absent')).toEqual([]);
  });

  it('matches directory names too', () => {
    const fs = setup();
    expect(fs.find('math')).toEqual(['/school/math']);
  });

  it('accepts a startPath argument', () => {
    const fs = setup();
    expect(fs.find('notes.txt', '/school/history')).toEqual([
      '/school/history/notes.txt',
    ]);
  });
});
