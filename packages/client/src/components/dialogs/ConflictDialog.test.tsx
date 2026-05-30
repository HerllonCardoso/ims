import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConflictDialog } from './ConflictDialog';

describe('ConflictDialog', () => {
  it('invokes onChoose with "overwrite"', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<ConflictDialog op="move" src="/a" dest="/b" onChoose={onChoose} />);
    await user.click(screen.getByRole('button', { name: /overwrite/i }));
    expect(onChoose).toHaveBeenCalledWith('overwrite');
  });

  it('invokes onChoose with "rename"', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<ConflictDialog op="copy" src="/a" dest="/b" onChoose={onChoose} />);
    await user.click(screen.getByRole('button', { name: /auto-rename/i }));
    expect(onChoose).toHaveBeenCalledWith('rename');
  });

  it('invokes onChoose with null on Cancel', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<ConflictDialog op="move" src="/a" dest="/b" onChoose={onChoose} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onChoose).toHaveBeenCalledWith(null);
  });
});
