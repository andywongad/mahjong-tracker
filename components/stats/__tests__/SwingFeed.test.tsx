// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { SwingSection } from '../SwingSection';
import { FeedMatrix } from '../FeedMatrix';
import { stats } from '@/lib/scoring';
import { OUR_TABLE } from '@/lib/rules/types';
import {
  AUG_19_2026_HANDS,
  AUG_19_2026_PLAYERS,
} from '@/lib/scoring/fixtures/aug-19-2026';

const RESULT = stats({
  players: AUG_19_2026_PLAYERS,
  rules: OUR_TABLE,
  hands: AUG_19_2026_HANDS.map((hand, index) => ({
    ...hand,
    id: `h${index}`,
    seq: index,
  })),
} as never);

describe('swings', () => {
  it('says how far each player travelled, not just where they stopped', () => {
    render(<SwingSection players={RESULT.players} />);
    const rows = screen.getAllByRole('listitem');

    // The third player: down to -18, up to +89, finished +64.
    const third = within(rows[2]);
    expect(third.getByText('+64')).toBeVisible();
    expect(third.getByText(/Low -18 · High \+89/)).toBeVisible();
    expect(third.getByText(/Best run \+107/)).toBeVisible();
    expect(third.getByText(/Gave back 25/)).toBeVisible();
  });

  it('describes the bar for anyone who cannot see it', () => {
    render(<SwingSection players={RESULT.players} />);
    expect(
      screen.getByRole('img', { name: 'Between -18 and 89, finishing 64' }),
    ).toBeVisible();
  });

  it('leaves out a run or a giveback that never happened', () => {
    const flat = RESULT.players.map((player) => ({
      ...player,
      score: 0,
      swing: {
        high: 0,
        highAtHand: 0,
        low: 0,
        lowAtHand: 0,
        bestRun: 0,
        bestRunFromHand: 0,
        worstSlide: 0,
        worstSlideFromHand: 0,
        worstSlideToHand: 0,
        gaveBack: 0,
      },
    }));
    render(<SwingSection players={flat} />);
    expect(screen.queryByText(/Best run/)).toBeNull();
    expect(screen.queryByText(/Gave back/)).toBeNull();
  });
});

describe('who feeds whom', () => {
  it('keeps the direction, which is the point of asking', () => {
    render(<FeedMatrix players={RESULT.players} feed={RESULT.feed} />);
    const rows = screen.getAllByRole('row');

    // Player B's row: fed Player D twice.
    const fedByB = within(rows[2]);
    expect(fedByB.getByRole('rowheader')).toHaveTextContent('Player B');
    const cellsB = fedByB.getAllByRole('cell');
    expect(cellsB[3]).toHaveTextContent('2');
    expect(cellsB[3]).toHaveTextContent('16');

    // Player D's row: never fed Player B at all.
    const fedByD = within(rows[4]);
    expect(fedByD.getAllByRole('cell')[1]).toHaveTextContent('·');
  });

  it('never lets a player feed themselves', () => {
    render(<FeedMatrix players={RESULT.players} feed={RESULT.feed} />);
    const rows = screen.getAllByRole('row');
    for (let seat = 0; seat < 4; seat += 1) {
      expect(
        within(rows[seat + 1]).getAllByRole('cell')[seat],
      ).toHaveTextContent('—');
    }
  });

  it('shows nothing at all when nobody has dealt in', () => {
    const { container } = render(
      <FeedMatrix players={RESULT.players} feed={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
