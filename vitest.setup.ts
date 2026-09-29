import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Each test gets a fresh DOM, so one leaving a sheet open cannot affect another.
afterEach(() => {
  cleanup();
});
