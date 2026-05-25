// @ts-check
const { generateAvailableSlots } = require('../services/slots');

/** Convierte hora local HH:MM en ISO esperado para _date_ */
function t(date, time) {
  return new Date(`${date}T${time}:00`).toISOString();
}

describe('generateAvailableSlots', () => {

  it('genera slots para día hábil sin turnos', () => {
    const slots = generateAvailableSlots('2026-06-01', 30, [], { startHour: 9, endHour: 13, workDays: [1, 2, 3, 4, 5] });
    expect(slots).toHaveLength(8);
    expect(slots[0]).toBe(t('2026-06-01', '09:00'));
    expect(slots[7]).toBe(t('2026-06-01', '12:30'));
  });

  it('devuelve array vacío para día no hábil', () => {
    const slots = generateAvailableSlots('2026-06-07', 30, [], { startHour: 9, endHour: 13, workDays: [1, 2, 3, 4, 5] });
    expect(slots).toEqual([]);
  });

  it('excluye slots que colisionan con turno existente', () => {
    const apptISO = t('2026-06-01', '10:00'); // 10:00–11:00 local
    const appointments = [{ appointment_date: apptISO, service_duration: 60 }];
    const slots = generateAvailableSlots('2026-06-01', 30, appointments, { startHour: 9, endHour: 17, workDays: [1, 2, 3, 4, 5] });

    // 09:00–09:30 no colisiona → debe estar (termina antes de las 10:00)
    expect(slots).toContain(t('2026-06-01', '09:00'));
    // 09:30–10:00 termina exactamente a las 10:00, no colisiona → debe estar
    expect(slots).toContain(t('2026-06-01', '09:30'));
    // 10:00–10:30 colisiona (10:00 < 11:00 && 10:30 > 10:00) → no debe estar
    expect(slots).not.toContain(t('2026-06-01', '10:00'));
    // 11:00–11:30 empieza justo cuando termina el turno, no colisiona → debe estar
    expect(slots).toContain(t('2026-06-01', '11:00'));
  });

  it('usa defaults si no se pasa tenantConfig', () => {
    const slots = generateAvailableSlots('2026-06-01', 30, []);
    expect(slots.length).toBeGreaterThan(0);
  });

  it('no genera slots que excedan endHour', () => {
    const slots = generateAvailableSlots('2026-06-01', 60, [], { startHour: 11, endHour: 12, workDays: [1] });
    expect(slots).toHaveLength(1);
    expect(slots[0]).toBe(t('2026-06-01', '11:00'));
  });
});
