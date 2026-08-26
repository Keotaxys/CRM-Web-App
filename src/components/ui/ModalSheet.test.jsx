import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ModalSheet from './ModalSheet';

function Dialog({ open, onClose, initialFocusRef, footer }) {
  return (
    <>
      <button type="button">ກ່ອນເປີດ</button>
      <ModalSheet open={open} onClose={onClose} title="ສ້າງໃໝ່" description="ລາຍລະອຽດ" initialFocusRef={initialFocusRef} footer={footer}>
        <button ref={initialFocusRef} type="button">ຕົວເລືອກ</button>
        <button type="button">ປິດ</button>
      </ModalSheet>
    </>
  );
}

function EmptyDialog({ open, onClose }) {
  return (
    <ModalSheet open={open} onClose={onClose} title="ວ່າງ">
      <button type="button" disabled>ບໍ່ພ້ອມ</button>
      <div hidden tabIndex="0">ຖືກເຊື່ອງ</div>
    </ModalSheet>
  );
}

describe('ModalSheet', () => {
  it('renders a labelled portal dialog and closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: 'ສ້າງໃໝ່' });
    expect(dialog).toBeInTheDocument();
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(screen.getByText('ລາຍລະອຽດ')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('wraps Tab focus in the dialog and honours an initial focus ref', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const initialFocusRef = { current: null };
    render(<Dialog open onClose={onClose} initialFocusRef={initialFocusRef} />);

    const firstChoice = screen.getByRole('button', { name: 'ຕົວເລືອກ' });
    expect(firstChoice).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'ປິດ' })).toHaveFocus();
    await user.tab();
    expect(firstChoice).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'ປິດ' })).toHaveFocus();
  });

  it('returns focus to the dialog when Tab starts outside its focus scope', () => {
    render(<Dialog open onClose={vi.fn()} />);

    const opener = screen.getByRole('button', { name: 'ກ່ອນເປີດ' });
    const firstChoice = screen.getByRole('button', { name: 'ຕົວເລືອກ' });
    opener.focus();

    fireEvent.keyDown(opener, { key: 'Tab' });

    expect(firstChoice).toHaveFocus();
  });

  it('contains programmatic focus that enters outside the dialog', () => {
    render(<Dialog open onClose={vi.fn()} />);

    const opener = screen.getByRole('button', { name: 'ກ່ອນເປີດ' });
    const firstChoice = screen.getByRole('button', { name: 'ຕົວເລືອກ' });
    opener.focus();
    fireEvent.focusIn(opener);

    expect(firstChoice).toHaveFocus();
  });

  it('keeps the active dialog control focused when the parent rerenders', () => {
    const { rerender } = render(<Dialog open onClose={() => {}} />);
    const secondChoice = screen.getByRole('button', { name: 'ປິດ' });
    secondChoice.focus();

    rerender(<Dialog open onClose={() => {}} />);

    expect(secondChoice).toHaveFocus();
  });

  it('focuses an empty dialog and cleans up its lock when unmounted', () => {
    document.body.style.overflow = 'auto';
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'ກ່ອນເປີດວ່າງ';
    document.body.append(opener);
    opener.focus();
    const { rerender, unmount } = render(<EmptyDialog open={false} onClose={vi.fn()} />);

    rerender(<EmptyDialog open onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: 'ວ່າງ' });
    expect(dialog).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('auto');
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('closes only from the backdrop and restores focus and scroll state after closing', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    document.body.style.overflow = 'scroll';
    const { rerender } = render(<Dialog open={false} onClose={onClose} />);
    const opener = screen.getByRole('button', { name: 'ກ່ອນເປີດ' });
    opener.focus();

    rerender(<Dialog open onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'ຕົວເລືອກ' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe('hidden');
    await user.click(dialog.parentElement);
    expect(onClose).toHaveBeenCalledOnce();

    rerender(<Dialog open={false} onClose={onClose} />);
    expect(document.body.style.overflow).toBe('scroll');
    expect(opener).toHaveFocus();
  });
});
