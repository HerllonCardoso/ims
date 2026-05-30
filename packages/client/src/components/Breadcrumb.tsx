import { cn } from '@/lib/utils';

interface Props {
  path: string;
  onNavigate: (path: string) => void;
}

export function Breadcrumb({ path, onNavigate }: Props): JSX.Element {
  const segments = path === '/' ? [] : path.split('/').filter(Boolean);
  const parts = [{ label: '/', path: '/' }];
  let acc = '';
  for (const seg of segments) {
    acc += `/${seg}`;
    parts.push({ label: seg, path: acc });
  }

  return (
    <nav className="flex items-center gap-1 text-[14px]" aria-label="Breadcrumb">
      {parts.map((part, i) => {
        const isLast = i === parts.length - 1;
        return (
          <div key={part.path} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onNavigate(part.path)}
              className={cn(
                'rounded-pill px-3 py-1',
                isLast ? 'font-bold text-foreground' : 'text-foreground-muted hover:bg-surface-2',
              )}
            >
              {part.label}
            </button>
            {!isLast && <span className="text-foreground-muted">/</span>}
          </div>
        );
      })}
    </nav>
  );
}
