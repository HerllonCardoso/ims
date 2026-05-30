import { TreeNodeRow } from './TreeNode';
import { toast } from 'sonner';
import { useApi } from '@/hooks/useApi';
import { api } from '@/api/client';
import { ApiError } from '@/api/request';
import type { DialogState } from '@/App';

interface Props {
  viewedPath: string;
  onNavigate: (path: string) => void;
  treeRevision: number;
  onDialog: (d: DialogState | null) => void;
  onMutated: () => void;
}

export function Sidebar({
  viewedPath,
  onNavigate,
  treeRevision,
  onDialog,
  onMutated,
}: Props): JSX.Element {
  const { data, error, loading } = useApi(() => api.tree('/', 1), [], treeRevision);

  async function moveInto(src: string, dest: string): Promise<void> {
    try {
      await api.move({ src, dest });
      onMutated();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.code === 'AlreadyExistsError') {
        onDialog({
          kind: 'conflict',
          op: 'move',
          src,
          dest,
          onChoose: (policy) => {
            if (!policy) return;
            api
              .move({ src, dest, onConflict: policy })
              .then(onMutated)
              .catch((err) => toast.error(err instanceof Error ? err.message : String(err)));
          },
        });
        return;
      }
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

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
          onMoveInto={(src, dest) => void moveInto(src, dest)}
        />
      )}
    </aside>
  );
}
