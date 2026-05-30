import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/useApi';
import { api } from '@/api/client';

interface Props {
  path: string;
  treeRevision: number;
  onSaved: () => void;
}

export function FileView({ path, treeRevision, onSaved }: Props): JSX.Element {
  const { data, error, loading } = useApi(() => api.readFile(path), [path], treeRevision);
  const [content, setContent] = useState<string>('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setContent(data.content);
      setDirty(false);
    }
  }, [data]);

  if (loading) return <div className="py-6 text-foreground-muted">Loading…</div>;
  if (error) return <div className="py-6 text-destructive">{error.message}</div>;

  const name = path.split('/').pop() ?? path;

  async function save(): Promise<void> {
    setSaving(true);
    try {
      await api.writeFile({ path, content });
      setDirty(false);
      onSaved();
      toast.success('Saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col py-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[18px] font-semibold">{name}</h2>
        <Button variant="primary" disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
      <textarea
        className="flex-1 w-full resize-none rounded-[6px] bg-surface p-4 font-mono text-[14px] text-foreground focus:outline focus:outline-1 focus:outline-black"
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setDirty(true);
        }}
      />
    </div>
  );
}
