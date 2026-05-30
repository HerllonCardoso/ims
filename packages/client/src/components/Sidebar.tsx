import { TreeNodeRow } from './TreeNode';
import { useApi } from '@/hooks/useApi';
import { api } from '@/api/client';
import type { DialogState } from '@/App';

interface Props {
  viewedPath: string;
  onNavigate: (path: string) => void;
  treeRevision: number;
  onDialog: (d: DialogState | null) => void;
  onMutated: () => void;
}

export function Sidebar({ viewedPath, onNavigate, treeRevision }: Props): JSX.Element {
  const { data, error, loading } = useApi(() => api.tree('/', 1), [], treeRevision);

  return (
    <aside className="w-64 shrink-0 overflow-auto bg-surface p-3">
      <div className="mb-3 px-2 text-[12px] font-bold uppercase tracking-button text-foreground-muted">
        Files
      </div>
      {loading && <div className="px-2 text-foreground-muted">Loading…</div>}
      {error && <div className="px-2 text-destructive">{error.message}</div>}
      {data && (
        <TreeNodeRow
          node={data.root}
          viewedPath={viewedPath}
          onNavigate={onNavigate}
          treeRevision={treeRevision}
        />
      )}
    </aside>
  );
}
