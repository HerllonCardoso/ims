import { MoreHorizontal, File, Folder } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/useApi';
import { api } from '@/api/client';
import { ApiError } from '@/api/request';
import type { DialogState } from '@/App';
import { cn } from '@/lib/utils';

interface Props {
  path: string;
  treeRevision: number;
  onNavigate: (path: string) => void;
  onDialog: (d: DialogState | null) => void;
  onMutated: () => void;
}

export function DirectoryView({
  path,
  treeRevision,
  onNavigate,
  onDialog,
  onMutated,
}: Props): JSX.Element {
  const { data, error, loading } = useApi(() => api.listEntries(path), [path], treeRevision);
  const [menu, setMenu] = useState<string | null>(null);

  if (loading) return <div className="py-6 text-foreground-muted">Loading…</div>;
  if (error) return <div className="py-6 text-destructive">{error.message}</div>;
  if (!data) return <div />;

  function childPath(name: string): string {
    return path === '/' ? `/${name}` : `${path}/${name}`;
  }

  async function performMove(src: string, dest: string): Promise<void> {
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
    <div
      className="py-4"
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const src = e.dataTransfer.getData('text/x-ims-path');
        if (!src || src === path) return;
        const name = src.split('/').pop()!;
        void performMove(src, childPath(name));
      }}
    >
      {data.entries.length === 0 && <div className="text-foreground-muted">Empty directory.</div>}
      <ul className="flex flex-col gap-1">
        {data.entries.map((e) => {
          const p = childPath(e.name);
          const isDir = e.kind === 'directory';
          return (
            <li
              key={p}
              draggable
              onDragStart={(ev) => ev.dataTransfer.setData('text/x-ims-path', p)}
              onDragOver={(ev) => isDir && ev.preventDefault()}
              onDrop={(ev) => {
                if (!isDir) return;
                ev.preventDefault();
                ev.stopPropagation();
                const src = ev.dataTransfer.getData('text/x-ims-path');
                if (!src || src === p) return;
                const name = src.split('/').pop()!;
                void performMove(src, p === '/' ? `/${name}` : `${p}/${name}`);
              }}
              className={cn(
                'flex items-center gap-3 rounded-[6px] bg-surface px-3 py-2',
                'hover:bg-surface-2',
              )}
            >
              <button
                type="button"
                onClick={() => onNavigate(p)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                {isDir ? <Folder className="h-5 w-5" /> : <File className="h-5 w-5" />}
                <span className="text-[16px]">{e.name}</span>
              </button>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMenu(menu === p ? null : p)}
                  aria-label="Row actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                {menu === p && (
                  <div className="absolute right-0 top-9 z-10 flex w-40 flex-col gap-1 rounded-[10px] bg-card p-2 shadow-dialog">
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-left text-[14px] hover:bg-surface-2"
                      onClick={() => {
                        setMenu(null);
                        onDialog({ kind: 'rename', path: p, name: e.name });
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-left text-[14px] hover:bg-surface-2"
                      onClick={() => {
                        setMenu(null);
                        onDialog({ kind: 'move', src: p });
                      }}
                    >
                      Move to…
                    </button>
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-left text-[14px] hover:bg-surface-2"
                      onClick={() => {
                        setMenu(null);
                        onDialog({ kind: 'copy', src: p });
                      }}
                    >
                      Copy to…
                    </button>
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-left text-[14px] text-destructive hover:bg-surface-2"
                      onClick={() => {
                        setMenu(null);
                        onDialog({ kind: 'delete', path: p, isDirectory: isDir });
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
