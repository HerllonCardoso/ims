import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/api/client', () => ({
  api: { move: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { api } from '@/api/client';
import { ApiError } from '@/api/request';
import { RenameDialog } from './RenameDialog';

beforeEach(() => {
  vi.mocked(api.move).mockReset();
});

describe('RenameDialog', () => {
  it('calls api.move with the new name under the same parent', async () => {
    vi.mocked(api.move).mockResolvedValue({ src: '/a/b', dest: '/a/c' });
    const user = userEvent.setup();
    const onRenamed = vi.fn();
    render(
      <RenameDialog
        path="/a/b"
        currentName="b"
        onClose={vi.fn()}
        onRenamed={onRenamed}
        onConflict={vi.fn()}
      />,
    );
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'c');
    await user.click(screen.getByRole('button', { name: /rename/i }));
    expect(api.move).toHaveBeenCalledWith({ src: '/a/b', dest: '/a/c' });
    expect(onRenamed).toHaveBeenCalledWith('/a/c');
  });

  it('closes without calling the API when name is unchanged', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <RenameDialog
        path="/a/b"
        currentName="b"
        onClose={onClose}
        onRenamed={vi.fn()}
        onConflict={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /rename/i }));
    expect(api.move).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  // sync throw avoids unhandled-rejection detection; the component's try/catch still handles it
  it('triggers onConflict when a 409 AlreadyExistsError occurs', async () => {
    vi.mocked(api.move).mockImplementation(() => {
      throw new ApiError(409, 'AlreadyExistsError', 'Already exists');
    });
    const user = userEvent.setup();
    const onConflict = vi.fn();
    const onClose = vi.fn();
    render(
      <RenameDialog
        path="/a/b"
        currentName="b"
        onClose={onClose}
        onRenamed={vi.fn()}
        onConflict={onConflict}
      />,
    );
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'c');
    await user.click(screen.getByRole('button', { name: /rename/i }));
    expect(onConflict).toHaveBeenCalledWith('/a/b', '/a/c', expect.any(Function));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows inline error on other API errors', async () => {
    vi.mocked(api.move).mockImplementation(() => {
      throw new Error('network failure');
    });
    const user = userEvent.setup();
    render(
      <RenameDialog
        path="/a/b"
        currentName="b"
        onClose={vi.fn()}
        onRenamed={vi.fn()}
        onConflict={vi.fn()}
      />,
    );
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'c');
    await user.click(screen.getByRole('button', { name: /rename/i }));
    expect(await screen.findByText('network failure')).toBeInTheDocument();
  });
});
