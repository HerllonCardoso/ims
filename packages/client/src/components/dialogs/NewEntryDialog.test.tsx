import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/api/client', () => ({
  api: { createDir: vi.fn(), createFile: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { api } from '@/api/client';
import { ApiError } from '@/api/request';
import { NewEntryDialog } from './NewEntryDialog';

beforeEach(() => {
  vi.mocked(api.createDir).mockReset();
  vi.mocked(api.createFile).mockReset();
});

describe('NewEntryDialog', () => {
  it('creates a folder under the parent path', async () => {
    vi.mocked(api.createDir).mockResolvedValue({ path: '/foo/bar' });
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const onClose = vi.fn();
    render(<NewEntryDialog kind="folder" parent="/foo" onCreated={onCreated} onClose={onClose} />);
    await user.type(screen.getByRole('textbox'), 'bar');
    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(api.createDir).toHaveBeenCalledWith({ path: '/foo/bar' });
    expect(onCreated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('creates a file at root', async () => {
    vi.mocked(api.createFile).mockResolvedValue({ path: '/f.txt' });
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(<NewEntryDialog kind="file" parent="/" onCreated={onCreated} onClose={vi.fn()} />);
    await user.type(screen.getByRole('textbox'), 'f.txt');
    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(api.createFile).toHaveBeenCalledWith({ path: '/f.txt' });
    expect(onCreated).toHaveBeenCalled();
  });

  it('shows error when name is empty', async () => {
    const user = userEvent.setup();
    render(<NewEntryDialog kind="folder" parent="/" onCreated={vi.fn()} onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(api.createDir).not.toHaveBeenCalled();
  });

  it('shows inline error message from ApiError', async () => {
    vi.mocked(api.createDir).mockRejectedValue(
      new ApiError(409, 'AlreadyExistsError', 'Already exists: /bar'),
    );
    const user = userEvent.setup();
    render(<NewEntryDialog kind="folder" parent="/" onCreated={vi.fn()} onClose={vi.fn()} />);
    await user.type(screen.getByRole('textbox'), 'bar');
    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(await screen.findByText('Already exists: /bar')).toBeInTheDocument();
  });
});
