
/**
 * Generación de slots de disponibilidad
 * @module services/slots
 */
import { formatTimeInTimeZone, getZonedDateString, zonedDateTimeToUtc } from '../utils/timezone';

/**
 * Genera los horarios disponibles para una fecha dados los appointments existentes
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @param {number} duration - Duración del servicio en minutos
 * @param {Array<{appointment_date: string, service_duration: number}>} appointments - Turnos ya reservados
 * @param {{ startHour?: number, endHour?: number, workDays?: number[] }} [tenantConfig] - Configuración del tenant
 * @param {Array<{date: string}>} [blockedDates] - Fechas bloqueadas
 * @param {string} [timeZone] - Zona horaria del establecimiento
 * @returns {string[]} Array de ISO strings de slots disponibles
 */
function generateAvailableSlots(date, duration, appointments, tenantConfig, blockedDates, timeZone = 'UTC') {
  const slots: string[] = [];
  if (blockedDates && blockedDates.some(b => {
    const bd = typeof b.date === 'string' ? b.date.slice(0, 10) : '';
    return bd === date;
  })) return [];
  const config = (tenantConfig && typeof tenantConfig === 'object' && !Array.isArray(tenantConfig) && tenantConfig.startHour != null)
    ? tenantConfig
    : { startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] };
  const selectedDateObj = new Date(date);
  const dayOfWeek = selectedDateObj.getUTCDay();

  if (!config.workDays.includes(dayOfWeek)) return [];

  const startHour = Number(config.startHour ?? 9);
  const endHour = Number(config.endHour ?? 19);

  for (let hour = startHour; hour < endHour; hour++) {
    for (const minute of [0, 30]) {
      const localTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const slotStart = zonedDateTimeToUtc(date, localTime, timeZone);
      if (!slotStart) continue;
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);
      const slotEndDate = getZonedDateString(slotEnd, timeZone);
      const slotEndTime = Number(formatTimeInTimeZone(slotEnd, timeZone).replace(':', ''));
      if (slotEndDate !== date || slotEndTime > endHour * 100) continue;
      const conflict = appointments.some(a => {
        const apptStart = new Date(a.appointment_date);
        const apptEnd = new Date(apptStart.getTime() + (a.service_duration || 30) * 60000);
        return slotStart < apptEnd && slotEnd > apptStart;
      });
      if (!conflict) slots.push(slotStart.toISOString());
    }
  }
  return slots;
}

export { generateAvailableSlots };
