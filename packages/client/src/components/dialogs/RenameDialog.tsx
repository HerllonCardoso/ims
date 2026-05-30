import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/api/client';
import { ApiError } from '@/api/request';
import type { ConflictPolicy } from '@ims/shared';

interface Props {
  path: string;
  currentName: string;
  onClose: () => void;
  onRenamed: (newPath: string) => void;
  onConflict: (
    src: string,
    dest: string,
    onChoose: (policy: ConflictPolicy | null) => void,
  ) => void;
}

function parentOf(path: string): string {
  if (path === '/') return '/';
  const idx = path.lastIndexOf('/');
  return idx === 0 ? '/' : path.slice(0, idx);
}

export function RenameDialog({ path, currentName, onClose, onRenamed, onConflict }: Props): JSX.Element {
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(): Promise<void> {
    if (!name.trim() || name === currentName) {
      onClose();
      return;
    }
    setBusy(true);
    setErr(null);
    const parent = parentOf(path);
    const dest = parent === '/' ? `/${name}` : `${parent}/${name}`;
    try {
      await api.move({ src: path, dest });
      onRenamed(dest);
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.code === 'AlreadyExistsError') {
        onClose();
        onConflict(path, dest, (policy) => {
          if (!policy) return;
          api
            .move({ src: path, dest, onConflict: policy })
            .then(() => onRenamed(dest))
            .catch((err2) => toast.error(err2 instanceof Error ? err2.message : String(err2)));
        });
        return;
      }
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
        />
        {err && <p className="text-[14px] text-destructive">{err}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => void submit()}>
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
