import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { EventInput, EventSourceFuncArg } from '@fullcalendar/core';
import { useDashboard } from '../dashboardContext';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import { api } from '../../../../api/client';
import { formatLocalDateInputValue } from '../../../../utils/dateTime';
import type { Appointment } from '../dashboardContext';

export default function CalendarTab() {
  const { t } = useTranslation();
  const { selectedStaff, setSelectedAppointment, addToast } = useDashboard();
  const calendarRef = useRef<FullCalendar | null>(null);

  const loadCalendarEvents = useCallback(async (range: EventSourceFuncArg): Promise<EventInput[]> => {
    const lastVisibleDate = new Date(range.end);
    lastVisibleDate.setDate(lastVisibleDate.getDate() - 1);
    const query = new URLSearchParams({
      dateFrom: formatLocalDateInputValue(range.start),
      dateTo: formatLocalDateInputValue(lastVisibleDate),
      page: '1',
      limit: '100',
    });
    if (selectedStaff) query.set('staffId', String(selectedStaff));

    try {
      const firstPage = await api.getFresh<{
        appointments: Appointment[];
        totalPages: number;
      }>(`/api/appointments?${query}`);
      const appointments = [...firstPage.appointments];

      for (let page = 2; page <= firstPage.totalPages; page += 1) {
        query.set('page', String(page));
        const nextPage = await api.getFresh<{ appointments: Appointment[] }>(`/api/appointments?${query}`);
        appointments.push(...nextPage.appointments);
      }

      return appointments.map(appointment => {
        const start = appointment.appointment_date || (
          appointment.date && appointment.time
            ? `${appointment.date}T${appointment.time}`
            : appointment.date
        );
        const colors: Record<string, { bg: string; border: string }> = {
          confirmed: { bg: 'rgba(34,197,94,0.25)', border: 'var(--success)' },
          completed: { bg: 'rgba(59,130,246,0.2)', border: 'var(--info)' },
          cancelled: { bg: 'rgba(239,68,68,0.2)', border: 'var(--danger)' },
          'no-show': { bg: 'rgba(168,85,247,0.2)', border: 'var(--pending)' },
          pending: { bg: 'rgba(234,179,8,0.25)', border: 'var(--warning)' },
        };
        const color = colors[appointment.status] || colors.pending;

        return {
          id: String(appointment.id),
          title: `${appointment.client_name}${(appointment.service_name || appointment.service) ? ` - ${appointment.service_name || appointment.service}` : ''}`,
          start,
          backgroundColor: color.bg,
          borderColor: color.border,
          textColor: 'var(--border-color)',
          extendedProps: { appt: appointment },
        };
      });
    } catch (error) {
      addToast(t('staffDashboard.toastLoadAppointmentsError'), 'error');
      throw error;
    }
  }, [addToast, selectedStaff, t]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      calendarRef.current?.getApi().refetchEvents();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel" style={{ padding: '28px', marginTop: '16px', minHeight: 550 }}>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="dayGridMonth"
        locale={esLocale}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        }}
        buttonText={{ today: t('staffDashboard.calendarToday'), month: t('staffDashboard.calendarMonth'), week: t('staffDashboard.calendarWeek'), day: t('staffDashboard.calendarDay'), list: t('staffDashboard.calendarList') }}
        firstDay={1}
        height={650}
        events={loadCalendarEvents}
        eventContent={arg => {
          const content = document.createElement('div');
          content.style.cssText = 'padding:2px 4px;font-size:13px;line-height:1.3';
          content.textContent = arg.event.title;
          return { domNodes: [content] };
        }}
        eventClick={(info) => {
          const appt = info.event.extendedProps.appt as Appointment;
          if (appt) setSelectedAppointment(appt);
        }}
      />
    </div>
  );
}
