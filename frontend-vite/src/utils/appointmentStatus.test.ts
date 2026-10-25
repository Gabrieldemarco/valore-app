import { describe, expect, it } from 'vitest';
import { getAppointmentStatusLabel } from './appointmentStatus';

describe('getAppointmentStatusLabel', () => {
  it('translates known appointment statuses', () => {
    const translate = (key: string) => `translated:${key}`;

    expect(getAppointmentStatusLabel('confirmed', translate)).toBe('translated:appointmentManage.statusConfirmed');
    expect(getAppointmentStatusLabel('no-show', translate)).toBe('translated:appointmentManage.statusNoShow');
  });

  it('preserves unknown status values', () => {
    expect(getAppointmentStatusLabel('custom-status', key => key)).toBe('custom-status');
  });
});
