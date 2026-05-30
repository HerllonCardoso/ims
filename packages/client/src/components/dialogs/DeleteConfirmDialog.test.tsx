import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/api/client', () => ({
  api: { remove: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { api } from '@/api/client';
import { ApiError } from '@/api/request';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

beforeEach(() => {
  vi.mocked(api.remove).mockReset();
});

describe('DeleteConfirmDialog', () => {
  it('calls api.remove with recursive=false by default', async () => {
    vi.mocked(api.remove).mockResolvedValue(null);
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    render(
      <DeleteConfirmDialog
        path="/a.txt"
        isDirectory={false}
        onClose={vi.fn()}
        onDeleted={onDeleted}
      />,
    );
    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(api.remove).toHaveBeenCalledWith('/a.txt', false);
    expect(onDeleted).toHaveBeenCalled();
  });

  it('does not show the recursive checkbox for files', () => {
    render(
      <DeleteConfirmDialog
        path="/a.txt"
        isDirectory={false}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('shows the recursive checkbox for directories', () => {
    render(
      <DeleteConfirmDialog path="/d" isDirectory={true} onClose={vi.fn()} onDeleted={vi.fn()} />,
    );
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('calls api.remove with recursive=true when checkbox is checked', async () => {
    vi.mocked(api.remove).mockResolvedValue(null);
    const user = userEvent.setup();
    render(
      <DeleteConfirmDialog path="/d" isDirectory={true} onClose={vi.fn()} onDeleted={vi.fn()} />,
    );
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(api.remove).toHaveBeenCalledWith('/d', true);
  });

  it('auto-checks recursive after DirectoryNotEmptyError', async () => {
    // sync throw avoids unhandled-rejection detection; the component's try/catch still handles it
    vi.mocked(api.remove).mockImplementation(() => {
      throw new ApiError(409, 'DirectoryNotEmptyError', 'not empty');
    });
    const user = userEvent.setup();
    render(
      <DeleteConfirmDialog path="/d" isDirectory={true} onClose={vi.fn()} onDeleted={vi.fn()} />,
    );
    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});
