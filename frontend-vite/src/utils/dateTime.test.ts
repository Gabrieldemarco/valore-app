import { describe, expect, it } from 'vitest';
import { formatLocalDateInputValue, parseLocalDateTime } from './dateTime';

describe('local date-time helpers', () => {
  it('formats a date input using the local calendar date', () => {
    expect(formatLocalDateInputValue(new Date(2026, 9, 24, 23, 30))).toBe('2026-10-24');
  });

  it('parses date and time as local wall-clock values', () => {
    const date = parseLocalDateTime('2026-10-24', '14:30');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(9);
    expect(date.getDate()).toBe(24);
    expect(date.getHours()).toBe(14);
    expect(date.getMinutes()).toBe(30);
  });
});
