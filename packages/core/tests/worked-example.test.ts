import { FileSystem } from '../src/filesystem';

/**
 * End-to-end walk through a representative directory session: create and enter
 * directories, list and delete them, and navigate with `..`. Each step is
 * annotated so the test reads top-to-bottom as a usage example.
 *
 * Note: `ls` returns children sorted (see the README "Library API" section), so
 * the expected values below are the sorted equivalents.
 */
describe('FileSystem — worked example', () => {
  it('reproduces a full directory session end-to-end', () => {
    const fs = new FileSystem();

    // make "school" directory
    fs.mkdir('school');
    // change directory to "school"
    fs.cd('school');
    // get working directory => "/school"
    expect(fs.pwd()).toBe('/school');

    // make "homework" directory
    fs.mkdir('homework');
    // change directory to "homework"
    fs.cd('homework');

    // make "math" directory
    fs.mkdir('math');
    // make "lunch" directory
    fs.mkdir('lunch');
    // make "history" directory
    fs.mkdir('history');
    // make "spanish" directory
    fs.mkdir('spanish');

    // delete "lunch" directory
    fs.rmdir('lunch');
    // get working directory contents => ["math", "history", "spanish"]  (sorted here)
    expect(fs.ls()).toEqual(['history', 'math', 'spanish']);
    // get working directory => "/school/homework"
    expect(fs.pwd()).toBe('/school/homework');

    // change directory to parent
    fs.cd('..');
    // make "cheatsheet" directory
    fs.mkdir('cheatsheet');
    // get working directory contents => ["homework", "cheatsheet"]  (sorted here)
    expect(fs.ls()).toEqual(['cheatsheet', 'homework']);

    // delete "cheatsheet" directory
    fs.rmdir('cheatsheet');
    // change directory to parent
    fs.cd('..');
    // get working directory => "/"
    expect(fs.pwd()).toBe('/');
  });
});
