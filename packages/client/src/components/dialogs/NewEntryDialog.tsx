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

interface Props {
  kind: 'folder' | 'file';
  parent: string;
  onClose: () => void;
  onCreated: () => void;
}

export function NewEntryDialog({ kind, parent, onClose, onCreated }: Props): JSX.Element {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(): Promise<void> {
    if (!name.trim()) {
      setErr('Name is required');
      return;
    }
    setBusy(true);
    setErr(null);
    const path = parent === '/' ? `/${name}` : `${parent}/${name}`;
    try {
      if (kind === 'folder') {
        await api.createDir({ path });
      } else {
        await api.createFile({ path });
      }
      onCreated();
      onClose();
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message);
      } else {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New {kind}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder={kind === 'folder' ? 'folder-name' : 'file-name.txt'}
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
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
