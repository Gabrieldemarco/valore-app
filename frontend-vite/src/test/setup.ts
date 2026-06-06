import '@testing-library/jest-dom';
import { clearApiCache } from '../api/client';
import { beforeEach, vi } from 'vitest';

vi.mock('i18next-browser-languagedetector', () => {
  function MockDetector() {
    this.type = 'languageDetector';
  }
  MockDetector.prototype.init = function () {};
  MockDetector.prototype.detect = function () { return 'es'; };
  MockDetector.prototype.cacheUserLanguage = function () {};
  MockDetector.type = 'languageDetector';
  return { default: MockDetector };
});

import i18n from '../i18n';

beforeEach(() => {
  clearApiCache();
});
