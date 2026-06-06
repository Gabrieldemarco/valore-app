
/**
 * Generación de slots de disponibilidad
 * @module services/slots
 */

/**
 * Genera los horarios disponibles para una fecha dados los appointments existentes
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @param {number} duration - Duración del servicio en minutos
 * @param {Array<{appointment_date: string, service_duration: number}>} appointments - Turnos ya reservados
 * @param {{ startHour?: number, endHour?: number, workDays?: number[] }} [tenantConfig] - Configuración del tenant
 * @param {Array<{date: string}>} [blockedDates] - Fechas bloqueadas
 * @returns {string[]} Array de ISO strings de slots disponibles
 */
function generateAvailableSlots(date, duration, appointments, tenantConfig, blockedDates) {
  const slots = [];
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

  const startHour = parseInt(config.startHour) || 9;
  const endHour = parseInt(config.endHour) || 19;

  for (let hour = startHour; hour < endHour; hour++) {
    for (const minute of [0, 30]) {
      const slotStart = new Date(`${date}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);
      if (slotEnd.getHours() > endHour || (slotEnd.getHours() === endHour && slotEnd.getMinutes() > 0)) continue;
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
