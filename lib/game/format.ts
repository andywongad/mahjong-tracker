/** Dates the way the group writes them, for example "Aug 19, 2026". */
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatGameDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
}

/**
 * The time of day a hand was recorded, as a table would say it.
 *
 * Only the clock time, never the date: a hand belongs to a game and a game
 * already carries its own date, so repeating it on nineteen rows would be
 * nineteen copies of something nobody is asking.
 *
 * Read in the reader's own timezone rather than the recorder's, which is the
 * right answer for the usual case of four people at one table and a defensible
 * one for a shared link read from elsewhere.
 */
export function formatHandTime(iso: string | undefined): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  return at
    .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
