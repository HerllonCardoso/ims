import { DirectoryNode, FileNode } from '../src/core/nodes';

describe('node model', () => {
  it('FileNode has kind="file" and empty content', () => {
    const f = new FileNode('a.txt', null);
    expect(f.kind).toBe('file');
    expect(f.content).toBe('');
    expect(f.name).toBe('a.txt');
    expect(f.parent).toBeNull();
  });

  it('DirectoryNode has kind="directory" and empty children map', () => {
    const d = new DirectoryNode('dir', null);
    expect(d.kind).toBe('directory');
    expect(d.children.size).toBe(0);
  });

  it('child links to parent', () => {
    const root = new DirectoryNode('', null);
    const child = new DirectoryNode('a', root);
    root.children.set('a', child);
    expect(child.parent).toBe(root);
    expect(root.children.get('a')).toBe(child);
  });
});
