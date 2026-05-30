import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { ConflictPolicy } from '@ims/shared';

interface Props {
  op: 'move' | 'copy';
  src: string;
  dest: string;
  onChoose: (policy: ConflictPolicy | null) => void;
}

export function ConflictDialog({ op, src, dest, onChoose }: Props): JSX.Element {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onChoose(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Already exists</AlertDialogTitle>
          <AlertDialogDescription>
            {op === 'move' ? 'Moving' : 'Copying'}{' '}
            <span className="font-bold text-foreground">{src}</span> to{' '}
            <span className="font-bold text-foreground">{dest}</span> would overwrite an existing
            entry.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onChoose(null)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => onChoose('rename')}>
            Auto-rename
          </Button>
          <Button variant="primary" onClick={() => onChoose('overwrite')}>
            Overwrite
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
