// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AboutSheet } from '../AboutSheet';

function setup() {
  const onClose = vi.fn();
  const onOpenGlossary = vi.fn();
  render(<AboutSheet open onClose={onClose} onOpenGlossary={onOpenGlossary} />);
  return { onClose, onOpenGlossary, user: userEvent.setup() };
}

describe('the how it works sheet', () => {
  it('teaches the record flow in the order the app asks for it', () => {
    setup();
    const steps = screen
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(steps[0]).toMatch(/tap whoever won/i);
    expect(steps[1]).toMatch(/Cheut Chung/);
    expect(steps[1]).toMatch(/Zi Mo/);
    expect(steps[2]).toMatch(/shooter/i);
    expect(steps[3]).toMatch(/faan/i);
  });

  it('says where games live without promising a backup', () => {
    setup();
    const where = screen.getByRole('heading', {
      name: /where your games live/i,
    });
    const section = where.closest('section');
    expect(section?.textContent).toMatch(/this device/i);
    // Sync does not exist yet, so the sheet must not imply that it does.
    expect(section?.textContent).toMatch(/still being built/i);
  });

  it('hands off to the glossary and gets out of the way', async () => {
    const { onClose, onOpenGlossary, user } = setup();
    await user.click(screen.getByRole('button', { name: /glossary/i }));
    expect(onOpenGlossary).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
