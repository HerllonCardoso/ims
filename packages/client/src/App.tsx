import { useState } from 'react';
import { Toaster } from 'sonner';
import { Sidebar } from '@/components/Sidebar';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Toolbar } from '@/components/Toolbar';
import { DirectoryView } from '@/components/DirectoryView';
import { FileView } from '@/components/FileView';
import { NewEntryDialog } from '@/components/dialogs/NewEntryDialog';
import { RenameDialog } from '@/components/dialogs/RenameDialog';
import { DeleteConfirmDialog } from '@/components/dialogs/DeleteConfirmDialog';
import { MoveCopyDialog } from '@/components/dialogs/MoveCopyDialog';
import { ConflictDialog } from '@/components/dialogs/ConflictDialog';
import { FindDialog } from '@/components/dialogs/FindDialog';
import { useViewedPath } from '@/hooks/useViewedPath';
import { useApi } from '@/hooks/useApi';
import { api } from '@/api/client';
import type { ConflictPolicy } from '@ims/shared';

export type DialogState =
  | { kind: 'new-folder'; parent: string }
  | { kind: 'new-file'; parent: string }
  | { kind: 'rename'; path: string; name: string }
  | { kind: 'delete'; path: string; isDirectory: boolean }
  | { kind: 'move'; src: string }
  | { kind: 'copy'; src: string }
  | {
      kind: 'conflict';
      op: 'move' | 'copy';
      src: string;
      dest: string;
      onChoose: (p: ConflictPolicy | null) => void;
    }
  | { kind: 'find' };

export default function App(): JSX.Element {
  const [viewedPath, setViewedPath] = useViewedPath();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [treeRevision, setTreeRevision] = useState(0);

  const stat = useApi(() => api.stat(viewedPath), [viewedPath], treeRevision);
  const bumpTree = (): void => setTreeRevision((n) => n + 1);

  const isFile = stat.data?.kind === 'file';

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        viewedPath={viewedPath}
        onNavigate={setViewedPath}
        treeRevision={treeRevision}
        onDialog={setDialog}
        onMutated={bumpTree}
      />
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-4 border-b border-surface-2 px-6 py-4">
          <Breadcrumb path={viewedPath} onNavigate={setViewedPath} />
        </div>
        <Toolbar viewedPath={viewedPath} isFile={isFile} onDialog={setDialog} />
        <div className="flex-1 overflow-auto px-6 pb-6">
          {isFile ? (
            <FileView path={viewedPath} treeRevision={treeRevision} onSaved={bumpTree} />
          ) : (
            <DirectoryView
              path={viewedPath}
              treeRevision={treeRevision}
              onNavigate={setViewedPath}
              onDialog={setDialog}
              onMutated={bumpTree}
            />
          )}
        </div>
      </main>

      {dialog?.kind === 'new-folder' && (
        <NewEntryDialog
          kind="folder"
          parent={dialog.parent}
          onClose={() => setDialog(null)}
          onCreated={bumpTree}
        />
      )}
      {dialog?.kind === 'new-file' && (
        <NewEntryDialog
          kind="file"
          parent={dialog.parent}
          onClose={() => setDialog(null)}
          onCreated={bumpTree}
        />
      )}
      {dialog?.kind === 'rename' && (
        <RenameDialog
          path={dialog.path}
          currentName={dialog.name}
          onClose={() => setDialog(null)}
          onRenamed={(newPath) => {
            if (viewedPath === dialog.path) setViewedPath(newPath);
            bumpTree();
          }}
          onConflict={(src, dest, onChoose) =>
            setDialog({ kind: 'conflict', op: 'move', src, dest, onChoose })
          }
        />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteConfirmDialog
          path={dialog.path}
          isDirectory={dialog.isDirectory}
          onClose={() => setDialog(null)}
          onDeleted={() => {
            if (viewedPath === dialog.path) setViewedPath('/');
            bumpTree();
          }}
        />
      )}
      {(dialog?.kind === 'move' || dialog?.kind === 'copy') && (
        <MoveCopyDialog
          op={dialog.kind}
          src={dialog.src}
          onClose={() => setDialog(null)}
          onDone={bumpTree}
          onConflict={(src, dest, onChoose) =>
            setDialog({ kind: 'conflict', op: dialog.kind, src, dest, onChoose })
          }
        />
      )}
      {dialog?.kind === 'conflict' && (
        <ConflictDialog
          op={dialog.op}
          src={dialog.src}
          dest={dialog.dest}
          onChoose={(p) => {
            dialog.onChoose(p);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === 'find' && (
        <FindDialog
          from={viewedPath}
          onClose={() => setDialog(null)}
          onSelect={(p) => {
            setViewedPath(p);
            setDialog(null);
          }}
        />
      )}

      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
}
