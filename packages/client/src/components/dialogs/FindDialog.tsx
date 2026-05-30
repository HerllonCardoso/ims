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

interface Props {
  from: string;
  onClose: () => void;
  onSelect: (path: string) => void;
}

export function FindDialog({ from, onClose, onSelect }: Props): JSX.Element {
  const [mode, setMode] = useState<'exact' | 'regex'>('exact');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const startFrom = from.startsWith('/') ? from : '/';

  async function run(): Promise<void> {
    if (!query.trim()) return;
    setBusy(true);
    try {
      if (mode === 'exact') {
        const res = await api.find(query, startFrom);
        setResults(res.matches);
      } else {
        const res = await api.findFirst(query, startFrom);
        setResults(res.match ? [res.match] : []);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Find</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 text-[14px]">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="mode"
              checked={mode === 'exact'}
              onChange={() => setMode('exact')}
            />
            Exact name
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="mode"
              checked={mode === 'regex'}
              onChange={() => setMode('regex')}
            />
            Regex (first match)
          </label>
        </div>
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={mode === 'exact' ? 'exact name' : '^pattern.*$'}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void run();
          }}
        />
        <div className="max-h-48 overflow-auto rounded-[6px] bg-surface px-2 py-2">
          {results.length === 0 ? (
            <p className="text-[14px] text-foreground-muted">
              {busy ? 'Searching…' : 'No results yet.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {results.map((p) => (
                <li key={p}>
                  <button
                    type="button"
                    className="w-full rounded px-2 py-1 text-left text-[14px] hover:bg-surface-2"
                    onClick={() => onSelect(p)}
                  >
                    {p}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => void run()}>
            Search
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
