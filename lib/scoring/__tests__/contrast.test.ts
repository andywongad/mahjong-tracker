import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Runs the WCAG contrast check over the real design tokens, so a colour change
 * that breaks a contrast requirement fails the suite rather than shipping.
 * The checker parses app/globals.css directly; see scripts/check-contrast.mjs.
 */
describe('design token contrast', () => {
  it('meets WCAG AA in both themes', () => {
    // fileURLToPath, because the project path contains spaces.
    const script = fileURLToPath(
      new URL('../../../scripts/check-contrast.mjs', import.meta.url),
    );
    let output = '';
    try {
      output = execFileSync('node', [script], { encoding: 'utf8' });
    } catch (error) {
      const failure = error as { stdout?: string };
      const failing = (failure.stdout ?? '')
        .split('\n')
        .filter((line) => line.includes('FAIL') || line.includes('MISSING'))
        .join('\n');
      throw new Error(`Contrast check failed:\n${failing}`);
    }
    expect(output).toContain('All contrast checks pass.');
  });
});
