// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AboutSections } from '../AboutScreen';

/**
 * The prose, on its own. It is a screen now rather than a sheet, and the
 * screen needs the navigation and games providers; the wording does not, so
 * it is rendered here without them. The handoff to the glossary, which does
 * navigate, is covered in e2e/nav.spec.ts.
 */
function setup() {
  render(<AboutSections />);
}

describe('what the how-it-works screen says', () => {
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

  it('says games live on the device, and what an account adds', () => {
    setup();
    const where = screen.getByRole('heading', {
      name: /where your games live/i,
    });
    const section = where.closest('section');

    // The promise that must survive every change: a hand is recorded here
    // first, with or without a connection.
    expect(section?.textContent).toMatch(/this device/i);
    expect(section?.textContent).toMatch(/no signal/i);

    // With no account, it must still say plainly that nothing is kept for
    // you. This was the whole of the old text and is now half of it.
    expect(section?.textContent).toMatch(/do not follow you to another device/i);

    // And it must say what signing in actually does, rather than leaving
    // somebody to find out that a copy exists.
    expect(section?.textContent).toMatch(/sign in/i);
  });


});
