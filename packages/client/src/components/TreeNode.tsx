import { useState } from 'react';
import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react';
import type { TreeNode as TreeNodeData } from '@ims/shared';
import { api } from '@/api/client';
import { cn } from '@/lib/utils';

interface Props {
  node: TreeNodeData;
  viewedPath: string;
  onNavigate: (path: string) => void;
  treeRevision: number;
}

export function TreeNodeRow({ node, viewedPath, onNavigate, treeRevision }: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<TreeNodeData[] | null>(node.children ?? null);
  const isActive = node.path === viewedPath;

  async function toggle(): Promise<void> {
    if (node.kind !== 'directory') return;
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && children === null) {
      const res = await api.tree(node.path, 1);
      setChildren(res.root.children ?? []);
    }
  }

  if (open && children !== null && (node as { _rev?: number })._rev !== treeRevision) {
    (node as { _rev?: number })._rev = treeRevision;
    void api.tree(node.path, 1).then((r) => setChildren(r.root.children ?? []));
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          onNavigate(node.path);
          void toggle();
        }}
        className={cn(
          'flex w-full items-center gap-1 rounded px-2 py-1 text-left text-[14px]',
          'hover:bg-surface-2',
          isActive ? 'font-bold text-foreground' : 'font-normal text-foreground-muted',
        )}
      >
        {node.kind === 'directory' ? (
          open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <span className="w-3.5" />
        )}
        {node.kind === 'directory' ? (
          <Folder className="h-4 w-4" />
        ) : (
          <File className="h-4 w-4" />
        )}
        <span className="truncate">{node.name || '/'}</span>
      </button>
      {open && children !== null && (
        <div className="ml-3 border-l border-surface-2 pl-1">
          {children.map((child) => (
            <TreeNodeRow
              key={child.path}
              node={child}
              viewedPath={viewedPath}
              onNavigate={onNavigate}
              treeRevision={treeRevision}
            />
          ))}
        </div>
      )}
    </div>
  );
}
