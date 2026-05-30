import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/api/client';
import { errorMessage, isApiErrorCode, isErrorLike } from '@/api/errors';

interface Props {
  path: string;
  isDirectory: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteConfirmDialog({ path, isDirectory, onClose, onDeleted }: Props): JSX.Element {
  const [recursive, setRecursive] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    setBusy(true);
    try {
      const result: unknown = await api.remove(path, recursive);
      if (isErrorLike(result)) {
        if (isApiErrorCode(result, 409, 'DirectoryNotEmptyError')) {
          setRecursive(true);
          toast.error('Directory is not empty. Toggle "Recursive" to delete it and all contents.');
        } else {
          toast.error(errorMessage(result));
        }
        return;
      }
      onDeleted();
      onClose();
    } catch (e) {
      if (isApiErrorCode(e, 409, 'DirectoryNotEmptyError')) {
        setRecursive(true);
        toast.error('Directory is not empty. Toggle "Recursive" to delete it and all contents.');
      } else {
        toast.error(errorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {isDirectory ? 'directory' : 'file'}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove <span className="font-bold text-foreground">{path}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {isDirectory && (
          <label className="flex items-center gap-2 text-[14px] text-foreground-muted">
            <input
              type="checkbox"
              checked={recursive}
              onChange={(e) => setRecursive(e.target.checked)}
            />
            Recursive (delete contents)
          </label>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline">Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => {
                void submit().catch(() => undefined);
              }}
            >
              Delete
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
