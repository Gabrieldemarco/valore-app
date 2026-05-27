import '@testing-library/jest-dom';
import { clearApiCache } from '../api/client';
import { beforeEach } from 'vitest';

beforeEach(() => {
  clearApiCache();
});
