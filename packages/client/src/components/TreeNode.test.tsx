import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TreeNode as TreeNodeData } from '@ims/shared';
import { api } from '@/api/client';
import { TreeNodeRow } from './TreeNode';

vi.mock('@/api/client', () => ({
  api: {
    tree: vi.fn(),
  },
}));

const treeMock = vi.mocked(api.tree);

describe('TreeNodeRow', () => {
  beforeEach(() => {
    treeMock.mockReset();
  });

  it('moves a dragged path into a dropped sidebar directory', () => {
    const onMoveInto = vi.fn();
    const dataTransfer = { getData: vi.fn(() => '/src.txt') } as unknown as DataTransfer;
    const node: TreeNodeData = { name: 'target', path: '/target', kind: 'directory' };

    render(
      <TreeNodeRow
        node={node}
        viewedPath="/"
        onNavigate={vi.fn()}
        treeRevision={0}
        onMoveInto={onMoveInto}
      />,
    );

    const target = screen.getByRole('button', { name: /target/i });
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });

    expect(onMoveInto).toHaveBeenCalledWith('/src.txt', '/target');
  });

  it('refetches open directories on revision change without mutating the node prop', async () => {
    const node: TreeNodeData = { name: 'target', path: '/target', kind: 'directory', children: [] };
    treeMock.mockResolvedValue({ root: { ...node, children: [] } });

    const { rerender } = render(
      <TreeNodeRow
        node={node}
        viewedPath="/"
        onNavigate={vi.fn()}
        treeRevision={0}
        onMoveInto={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /target/i }));
    await waitFor(() => expect(treeMock).toHaveBeenCalledTimes(1));

    rerender(
      <TreeNodeRow
        node={node}
        viewedPath="/"
        onNavigate={vi.fn()}
        treeRevision={1}
        onMoveInto={vi.fn()}
      />,
    );

    await waitFor(() => expect(treeMock).toHaveBeenCalledTimes(2));
    expect(Object.prototype.hasOwnProperty.call(node, '_rev')).toBe(false);
  });
});
