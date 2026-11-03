# Design review, round 2: Mahjong Tracker

Live at https://mahjong-tracker-ochre.vercel.app. This review was done on the deployed app at 390px and 1440px, covering home, both start flows, the table, recording a hand, Score a hand, Stats, Games/History, Glossary and Settings. The goal: make it feel as calm, clear and modern as an Apple or Airbnb app, for beginners and seasoned Hong Kong mahjong players alike.

## How to work

1. Read this whole brief. Reply with a phased plan, the files you expect to touch, and answers needed from me (see "Open questions"). Wait for my answers before starting.
2. Don't change the scoring engine's math. All existing tests, including the Aug 19 fixture, must stay green.
3. Before any UI change, capture Playwright screenshots at 390x844, 820x1180 and 1440x900 of: home, a game's table (with at least 3 hands recorded), the record-hand sheet at each step, Score a hand (empty and full), Stats, Games, Glossary, Settings, and the new-game sheet. Save to the gitignored `design-review/round2/before/`. After each phase, capture the routes that phase touched to `after/` and regenerate the side-by-side contact sheet at `design-review/round2/index.html`.
4. One commit per numbered item where practical, prefixed with its number (for example `R2-P0-1: glanceable seat cards`).
5. Stop for my review after P0-1, P0-2 and P0-4 individually. The other items can be reviewed at the end of each phase.

## Who we're designing for (unchanged, in priority order)

1. **The scorekeeper, mid-game, on a phone.** One hand, glancing between tiles and screen. Success: a hand recorded in a few seconds with no mistakes.
2. **Everyone at the table, reading from arm's length.** Success: scores, dealer and round readable from about 1 meter.
3. **After the game, on any device.** Success: settling up and enjoying the stats.

Principles: **restraint** (one clear focus per screen, fewer words), **glanceable** (big numbers where it matters), **one rule per thing** (one header style, one selected style, one word per term), **color with a job** (jade means the table and the main action, nothing else).

## P0: highest impact

### P0-1. Glanceable seat cards
**Seen:** seat totals are 20px. Names truncate at 390px ("Player…"). Labels "Total", "Last hand", wind names and "Dealer" are 8.8 to 9.6px.
**Change:**
- The total becomes the hero: 34px on phones, 40px on tablet and up, bold, tabular numerals, always signed (+64, −23, 0).
- Remove the "Total" label.
- Replace "Last hand 0" with a small pill under the total showing the last change (+16, −8). Hide it before the first hand and when the change was 0.
- Names: never truncate below 10 characters. If a name doesn't fit, step the size down once, then allow two lines.
- Wind character plus English wind name at 12px minimum. Dealer badge "莊 Dealer" at 12px minimum, inside the card's corner, not overlapping the edge.
**Done when:** at 390px, four 10-character names display in full and every total is readable in a screenshot viewed at 50% zoom.

### P0-2. Remove the 8 per-seat buttons
**Seen:** every seat has "食糊 Won" and "詐糊 False win" buttons, so the table shows 8 buttons and a rare event (false win) has the same weight as a win.
**Change:**
- The whole seat card is the tap target for "this player won." Give it a proper accessible name ("Player B, South, minus 39. Record a win for Player B.") and a pressed state (card moves down 2px).
- Under the table, one secondary button: **Other outcome**. It opens a small sheet with two choices: **Draw 流局** and **False win 詐糊** (False win then asks who called it).
- First-time hint, shown once per device and dismissible: "Tap the winner's seat to record a hand."
**Done when:** the table shows no buttons inside seat cards, and a Playwright test records a win, a draw and a false win through the new entry points.

### P0-3. Undo after saving a hand
**Change:** after saving any hand, show a toast for 8 seconds: "Hand 7 saved · Player B +20 · Undo". Undo removes that hand and restores the previous state, synced if signed in. Announce it in an `aria-live="polite"` region.
**Done when:** a test saves a hand, taps Undo, and the scores and hand count match the state before.

### P0-4. One front door for new games
**Seen:** home asks "I'm still learning" or "I know what I'm doing." The beginner path opens with "On a discard win, who pays?", which a beginner can't answer.
**Change:**
- Replace both cards with one primary **New game** button.
- New-game sheet, in this order:
  1. Players by seat. Names are placeholders, not pre-filled values ("East, deals first", "South", ...). Show the last group's names as one-tap chips ("Use last group: Aaron, Jad, Dave, Jacky").
  2. Rules: a single row showing "Hong Kong standard (recommended)" with a one-line summary and a **Change** link. "Help me choose" (the existing 4-question guide) lives inside Change, not at the front door.
  3. Date defaults to today and moves into a small "Date: Today · Change" line at the bottom.
  4. **Start game.**
**Done when:** starting a game with standard rules takes 4 name entries plus one tap, and a first-time user never sees a payout question unless they choose to.

### P0-5. Destructive actions behind a menu
**Seen:** "Delete this game" is a visible link on home and under the table, next to "End game early."
**Change:** add a ⋯ button to the game header with **Edit game**, **End game early** and **Delete game**. Delete asks for confirmation ("Delete the Oct 8 game? This can't be undone." with a red **Delete** and a **Cancel**). Remove the visible delete links from home and the table page.

## P1: consistency and polish

### P1-1. One header style everywhere
**Seen:** a dark green header on the Table; light headers on Stats, Score a hand, Glossary and History.
**Change:** use a light header with a large title on every screen (title 28px bold on phones, 34px on desktop), back or home on the left, actions on the right as icon buttons with labels on desktop. Jade is reserved for the table felt and primary buttons. Align the header to the same left edge as the content (on desktop it's currently about 16px further left).

### P1-2. Color with a job
- Jade fill only for: the table felt and primary buttons. The home "current game" card becomes a white card with a jade accent (thin left-edge stripe is NOT wanted; use a small jade "Live" or round indicator instead).
- Replace the dark "No tiles yet" bar in Score a hand (see P1-6).
- Player colors: replace red, green, blue and brown with non-signal colors so they never clash with red/green score colors. Proposal: indigo #3B5BDB, teal #0B7285, amber #C77700, plum #862E9C, with lighter variants for dark mode. Check contrast in both themes. Wind badges in the new-game sheet become neutral tiles with the character, not colored squares.
- One selected style for every choice (how they won, shooter, faan, seat, round): jade fill, white text. Never the player's color.

### P1-3. Type scale
- Interface text: use the system font stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif`) for better small-size legibility and a native feel. Keep Sora only for large titles and big numbers if it still looks right; show me both options in screenshots before committing.
- Keep Noto Serif TC (subset) for Chinese characters.
- Scale: 12 (minimum), 13, 15 (body), 17, 20, 28, 34, 40. Nothing below 12px anywhere. Add a test that fails if any rendered text is under 12px on the main routes.
- Tabular numerals on every score and number column.

### P1-4. Corners and shadows
- Three radii only: 12px cards, 20px sheets and dialogs, pill for buttons and chips. Remove 4, 8, 10 and 16.
- Two elevations only:
  - Resting (cards): `0 1px 2px rgba(23,33,30,.06), 0 4px 12px rgba(23,33,30,.04)`
  - Raised (sheets, dialogs, toasts): `0 12px 40px rgba(23,33,30,.18)`
- Dialog backdrop: darker scrim (`rgba(15,25,22,.45)`) plus `backdrop-filter: blur(8px)` where supported.
- Spacing on an 8px grid. More space between sections (32px) than within them (12–16px), so sections separate without extra boxes or lines.

### P1-5. Home
- The current game is the hero: date, round and hand ("East round · Hand 7"), the leader ("Player C leads, +64"), and a primary **Continue** button. If no hands are recorded yet, say "No hands yet" instead of four zeros.
- Below: **New game** (P0-4), then **Score a hand**, then a quiet list: Games, Glossary, How this works.
- Left-align everything, including section titles.
- Replace "Games are kept on this device..." with a sync status line: "Synced to your account", "On this device only · Sign in to sync", or "Offline · will sync".

### P1-6. Score a hand
- Collapse seat, round, self-drawn and concealed into one summary line at the top: "East seat · East round · Off a discard · Change". When opened from a game, fill it from the game.
- Replace the "No tiles yet" bar with 14 faint empty tile slots that fill left to right as tiles are tapped (extra slots appear for kongs). This shows a beginner the hand's shape without words.
- Keep one instruction line ("Tap each tile in the winning hand"). Remove the duplicate line. Move the flower rule behind an info button.
- Tile sizes: at least 56px wide on tablet and desktop, filling the content width in a 9-column grid. On phones keep 9 per row.

### P1-7. Stats
- Lead with 3 or 4 insight cards: **Leader** (name and score), **Most wins**, **Dealt in the most**, **Biggest hand**. Then the running-score chart. Then the existing tables inside a collapsible **Details** section, collapsed by default on phones.
- Remove "Audit: ... Scores cancel out." Fix pluralization ("1 hand", "2 hands") everywhere.
- Hide the running-score chart until there are at least 3 hands; before that show "The chart appears after a few hands."

### P1-8. Naming and copy
- Terms, everywhere, plain English first with Chinese as the accent:
  - 自摸 **Self-drawn** (not "Self pick")
  - 出銃 **Dealt in** (not "Shooter"; the question becomes "Who dealt in?")
  - 詐糊 **False win**
  - 流局 **Draw**
  - 莊 **Dealer**
  Keep Cheut Chung, Zi Mo, Zaa Wu, Lau Guk as the romanized names in the glossary and tooltips. All of this comes from the single terms module.
- Rename: "History" page → **Games**; "Tally details" → **Settle up**.
- Cut instructional copy by about half on every screen. No em dashes in UI copy (for example "We'll walk you through the scoring — four quick questions" goes away with P0-4, but check everywhere).
- Remove trailing periods from short labels ("Lau Guk." in the hand log).

### P1-9. Settings
Hide every "Coming soon" option. Settings shows only what works today: Appearance (System / Light / Dark), Account, About.

## P2: features

- **Glossary tooltips:** any term in the app opens a small popover with its definition and a "More" link to the glossary.
- **Saved player groups:** remember groups of four and offer them in the new-game sheet.
- **Keep screen awake** during an active game (Wake Lock API, graceful fallback).
- **Share link** for a game so others can follow along on their own phones (read-only, live).
- **Haptics** on save (`navigator.vibrate(10)` where supported); all motion respects `prefers-reduced-motion`.

## Accessibility (applies to every item)
- WCAG 2.2 AA contrast in both themes, including muted text on the felt.
- Touch targets at least 44x44px.
- Dialogs trap focus, return focus on close, and close on Escape.
- Every seat card and icon button has a clear accessible name.

## Open questions (ask me before starting)
1. System font for interface text, or keep Sora throughout? Show me screenshots of both on the table and home screens.
2. Is the proposed player palette (indigo, teal, amber, plum) OK?
3. Should "Other outcome" be one button that opens a choice, or two small buttons (Draw, False win) side by side under the table?

## Definition of done
- Before/after screenshots for every touched route at all three widths, with the contact sheet updated.
- All engine and Playwright tests pass, including the new ones above.
- No text under 12px, no touch target under 44px, one header style, one selected style, three radii, two shadows.
- Lighthouse Accessibility 100 on home, table and Score a hand.
