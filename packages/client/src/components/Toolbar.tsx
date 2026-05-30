import { FolderPlus, FilePlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DialogState } from '@/App';

interface Props {
  viewedPath: string;
  isFile: boolean;
  onDialog: (d: DialogState | null) => void;
}

export function Toolbar({ viewedPath, isFile, onDialog }: Props): JSX.Element {
  return (
    <div className="flex items-center gap-2 border-b border-surface-2 px-6 py-3">
      <Button onClick={() => onDialog({ kind: 'new-folder', parent: isFile ? '/' : viewedPath })}>
        <FolderPlus className="h-4 w-4" /> New folder
      </Button>
      <Button onClick={() => onDialog({ kind: 'new-file', parent: isFile ? '/' : viewedPath })}>
        <FilePlus className="h-4 w-4" /> New file
      </Button>
      <Button variant="outline" onClick={() => onDialog({ kind: 'find' })}>
        <Search className="h-4 w-4" /> Find
      </Button>
    </div>
  );
}
