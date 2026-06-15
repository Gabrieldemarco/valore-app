import '@testing-library/jest-dom';
import { clearApiCache } from '../api/client';
import { beforeEach, vi } from 'vitest';
import '../i18n';

vi.mock('i18next-browser-languagedetector', () => {
  function MockDetector(this: { type: string }) {
    this.type = 'languageDetector';
  }
  MockDetector.prototype.init = function () {};
  MockDetector.prototype.detect = function () { return 'es'; };
  MockDetector.prototype.cacheUserLanguage = function () {};
  MockDetector.type = 'languageDetector';
  return { default: MockDetector };
});

beforeEach(() => {
  clearApiCache();
});
