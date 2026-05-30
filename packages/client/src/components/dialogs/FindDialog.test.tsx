import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/api/client', () => ({
  api: { find: vi.fn(), findFirst: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { api } from '@/api/client';
import { FindDialog } from './FindDialog';

beforeEach(() => {
  vi.mocked(api.find).mockReset();
  vi.mocked(api.findFirst).mockReset();
});

describe('FindDialog', () => {
  it('calls api.find in exact mode and displays matches', async () => {
    vi.mocked(api.find).mockResolvedValue({ matches: ['/a/notes.txt', '/b/notes.txt'] });
    const user = userEvent.setup();
    render(<FindDialog from="/" onClose={vi.fn()} onSelect={vi.fn()} />);
    await user.type(screen.getByRole('textbox'), 'notes.txt');
    await user.click(screen.getByRole('button', { name: /search/i }));
    expect(api.find).toHaveBeenCalledWith('notes.txt', '/');
    expect(await screen.findByText('/a/notes.txt')).toBeInTheDocument();
    expect(screen.getByText('/b/notes.txt')).toBeInTheDocument();
  });

  it('calls api.findFirst in regex mode', async () => {
    vi.mocked(api.findFirst).mockResolvedValue({ match: '/a/foo' });
    const user = userEvent.setup();
    render(<FindDialog from="/" onClose={vi.fn()} onSelect={vi.fn()} />);
    await user.click(screen.getByRole('radio', { name: /regex/i }));
    await user.type(screen.getByRole('textbox'), '^foo');
    await user.click(screen.getByRole('button', { name: /search/i }));
    expect(api.findFirst).toHaveBeenCalledWith('^foo', '/');
    expect(await screen.findByText('/a/foo')).toBeInTheDocument();
  });

  it('shows no results when api returns empty', async () => {
    vi.mocked(api.find).mockResolvedValue({ matches: [] });
    const user = userEvent.setup();
    render(<FindDialog from="/" onClose={vi.fn()} onSelect={vi.fn()} />);
    await user.type(screen.getByRole('textbox'), 'missing');
    await user.click(screen.getByRole('button', { name: /search/i }));
    expect(await screen.findByText(/no results/i)).toBeInTheDocument();
  });

  it('calls onSelect when a result is clicked', async () => {
    vi.mocked(api.find).mockResolvedValue({ matches: ['/a/x'] });
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<FindDialog from="/" onClose={vi.fn()} onSelect={onSelect} />);
    await user.type(screen.getByRole('textbox'), 'x');
    await user.click(screen.getByRole('button', { name: /search/i }));
    await user.click(await screen.findByText('/a/x'));
    expect(onSelect).toHaveBeenCalledWith('/a/x');
  });
});
