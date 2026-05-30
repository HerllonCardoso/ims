import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/api/client', () => ({
  api: { move: vi.fn(), copy: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { api } from '@/api/client';
import { ApiError } from '@/api/request';
import { MoveCopyDialog } from './MoveCopyDialog';

beforeEach(() => {
  vi.mocked(api.move).mockReset();
  vi.mocked(api.copy).mockReset();
});

describe('MoveCopyDialog', () => {
  it('calls api.move with src and dest', async () => {
    vi.mocked(api.move).mockResolvedValue({ src: '/a', dest: '/b' });
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(
      <MoveCopyDialog op="move" src="/a" onClose={vi.fn()} onDone={onDone} onConflict={vi.fn()} />,
    );
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), '/b');
    await user.click(screen.getByRole('button', { name: /move/i }));
    expect(api.move).toHaveBeenCalledWith({ src: '/a', dest: '/b', recursive: false });
    expect(onDone).toHaveBeenCalled();
  });

  it('calls api.copy with src and dest', async () => {
    vi.mocked(api.copy).mockResolvedValue({ src: '/a', dest: '/c' });
    const user = userEvent.setup();
    render(
      <MoveCopyDialog op="copy" src="/a" onClose={vi.fn()} onDone={vi.fn()} onConflict={vi.fn()} />,
    );
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), '/c');
    await user.click(screen.getByRole('button', { name: /copy/i }));
    expect(api.copy).toHaveBeenCalledWith({ src: '/a', dest: '/c', recursive: false });
  });

  it('shows error when dest does not start with /', async () => {
    const user = userEvent.setup();
    render(
      <MoveCopyDialog op="move" src="/a" onClose={vi.fn()} onDone={vi.fn()} onConflict={vi.fn()} />,
    );
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'relative/path');
    await user.click(screen.getByRole('button', { name: /move/i }));
    expect(screen.getByText(/absolute path/i)).toBeInTheDocument();
    expect(api.move).not.toHaveBeenCalled();
  });

  it('triggers onConflict on 409 AlreadyExistsError', async () => {
    vi.mocked(api.move).mockRejectedValue(
      new ApiError(409, 'AlreadyExistsError', 'Already exists'),
    );
    const user = userEvent.setup();
    const onConflict = vi.fn();
    const onClose = vi.fn();
    render(
      <MoveCopyDialog
        op="move"
        src="/a"
        onClose={onClose}
        onDone={vi.fn()}
        onConflict={onConflict}
      />,
    );
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), '/b');
    await user.click(screen.getByRole('button', { name: /move/i }));
    expect(onConflict).toHaveBeenCalledWith('/a', '/b', expect.any(Function));
    expect(onClose).toHaveBeenCalled();
  });
});
