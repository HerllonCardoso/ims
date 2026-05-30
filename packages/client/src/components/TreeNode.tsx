import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react';
import type { TreeNode as TreeNodeData } from '@ims/shared';
import { api } from '@/api/client';
import { cn } from '@/lib/utils';

interface Props {
  node: TreeNodeData;
  viewedPath: string;
  onNavigate: (path: string) => void;
  treeRevision: number;
  onMoveInto?: (src: string, folderPath: string) => void;
}

export function TreeNodeRow({
  node,
  viewedPath,
  onNavigate,
  treeRevision,
  onMoveInto,
}: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<TreeNodeData[] | null>(node.children ?? null);
  const isActive = node.path === viewedPath;

  useEffect(() => {
    if (!open || node.kind !== 'directory') return;
    let cancelled = false;
    void api.tree(node.path, 1).then((res) => {
      if (!cancelled) {
        setChildren(res.root.children ?? []);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [node.kind, node.path, open, treeRevision]);

  useEffect(() => {
    if (!open) {
      setChildren(node.children ?? null);
    }
  }, [node.children, open]);

  return (
    <div>
      <button
        type="button"
        onDragOver={(e) => {
          if (node.kind === 'directory' && onMoveInto) {
            e.preventDefault();
          }
        }}
        onDrop={(e) => {
          if (node.kind !== 'directory' || !onMoveInto) return;
          e.preventDefault();
          e.stopPropagation();
          const src = e.dataTransfer.getData('text/x-ims-path');
          if (!src || src === node.path) return;
          onMoveInto(src, node.path);
        }}
        onClick={() => {
          onNavigate(node.path);
          if (node.kind === 'directory') {
            setOpen((value) => !value);
          }
        }}
        className={cn(
          'flex w-full items-center gap-1 rounded px-2 py-1 text-left text-[14px]',
          'hover:bg-surface-2',
          isActive ? 'font-bold text-foreground' : 'font-normal text-foreground-muted',
        )}
      >
        {node.kind === 'directory' ? (
          open ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )
        ) : (
          <span className="w-3.5" />
        )}
        {node.kind === 'directory' ? <Folder className="h-4 w-4" /> : <File className="h-4 w-4" />}
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
              onMoveInto={onMoveInto}
            />
          ))}
        </div>
      )}
    </div>
  );
}
