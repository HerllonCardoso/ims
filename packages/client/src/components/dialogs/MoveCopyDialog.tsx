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
  op: 'move' | 'copy';
  src: string;
  onClose: () => void;
  onDone: () => void;
  onConflict: (
    src: string,
    dest: string,
    onChoose: (policy: ConflictPolicy | null) => void,
  ) => void;
}

export function MoveCopyDialog({ op, src, onClose, onDone, onConflict }: Props): JSX.Element {
  const [dest, setDest] = useState<string>(src);
  const [recursive, setRecursive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(): Promise<void> {
    if (!dest.startsWith('/')) {
      setErr('Destination must be an absolute path starting with /');
      return;
    }
    setBusy(true);
    setErr(null);
    const fn = op === 'move' ? api.move : api.copy;
    try {
      await fn({ src, dest, recursive });
      onDone();
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.code === 'AlreadyExistsError') {
        onClose();
        onConflict(src, dest, (policy) => {
          if (!policy) return;
          fn({ src, dest, recursive, onConflict: policy })
            .then(onDone)
            .catch((err2) => toast.error(err2 instanceof Error ? err2.message : String(err2)));
        });
        return;
      }
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const label = op === 'move' ? 'Move' : 'Copy';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label} to…</DialogTitle>
        </DialogHeader>
        <p className="text-[14px] text-foreground-muted">Source: {src}</p>
        <Input
          autoFocus
          value={dest}
          onChange={(e) => setDest(e.target.value)}
          placeholder="/destination/path"
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
        />
        <label className="flex items-center gap-2 text-[14px] text-foreground-muted">
          <input
            type="checkbox"
            checked={recursive}
            onChange={(e) => setRecursive(e.target.checked)}
          />
          Create missing intermediate directories
        </label>
        {err && <p className="text-[14px] text-destructive">{err}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => void submit()}>
            {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
