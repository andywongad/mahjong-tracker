// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * Games live in the browser, so a storage failure has to be reported. The
 * dangerous version of this bug is silence: an empty app reads as "your games
 * are gone" to someone who recorded twenty hands last night.
 */
vi.mock('@/lib/game/localStore', () => ({
  ensureSeeded: vi
    .fn()
    .mockRejectedValue(
      new Error('Access to storage is not allowed from this context.'),
    ),
  pendingCount: vi.fn().mockResolvedValue(0),
  localStore: {
    listGames: vi.fn().mockResolvedValue([]),
    getGame: vi.fn(),
    getGameBySlug: vi.fn(),
    createGame: vi.fn(),
    updateGame: vi.fn(),
    deleteGame: vi.fn(),
    addHand: vi.fn(),
    updateHand: vi.fn(),
    deleteHand: vi.fn(),
  },
}));

const { GamesProvider } = await import('@/lib/game/GamesProvider');
const { NavigationProvider } = await import('@/lib/game/navigation');
const { GlossaryProvider } = await import('@/lib/glossary/GlossaryProvider');
const { AppShell } = await import('@/components/AppShell');

function renderApp() {
  return render(
    <GamesProvider>
      <NavigationProvider>
        <GlossaryProvider>
          <AppShell />
        </GlossaryProvider>
      </NavigationProvider>
    </GamesProvider>,
  );
}

describe('when the browser will not open storage', () => {
  it('says the games could not be opened', async () => {
    renderApp();
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /could not be opened/i }),
      ).toBeVisible(),
    );
  });

  it('never implies the games are gone', async () => {
    renderApp();
    await waitFor(() => screen.getByRole('heading', { name: /could not be opened/i }));

    expect(screen.getByText(/nothing has been deleted/i)).toBeVisible();
    // The empty state must not be what a broken database looks like.
    expect(screen.queryByText(/no games yet/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /start a new game/i })).toBeNull();
  });

  it('offers a way out and says what went wrong', async () => {
    renderApp();
    await waitFor(() => screen.getByRole('heading', { name: /could not be opened/i }));

    expect(screen.getByRole('button', { name: /try again/i })).toBeVisible();
    expect(screen.getByText(/not allowed from this context/i)).toBeInTheDocument();
  });
});
