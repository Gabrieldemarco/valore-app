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
import type { Appointment } from '../dashboardContext';
import { getAppointmentStatusLabel } from '../../../../utils/appointmentStatus';
import { CalendarDays, Clock3 } from 'lucide-react';

export default function CalendarTab() {
  const { t } = useTranslation();
  const { selectedStaff, setSelectedAppointment, addToast, settings } = useDashboard();
  const calendarRef = useRef<FullCalendar | null>(null);

  const loadCalendarEvents = useCallback(async (range: EventSourceFuncArg): Promise<EventInput[]> => {
    const lastVisibleDate = new Date(`${range.endStr.slice(0, 10)}T00:00:00Z`);
    lastVisibleDate.setUTCDate(lastVisibleDate.getUTCDate() - 1);
    const query = new URLSearchParams({
      dateFrom: range.startStr.slice(0, 10),
      dateTo: lastVisibleDate.toISOString().slice(0, 10),
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
        return {
          id: String(appointment.id),
          title: `${appointment.client_name}${(appointment.service_name || appointment.service) ? ` - ${appointment.service_name || appointment.service}` : ''}`,
          start,
          classNames: [`dash-calendar-${appointment.status.replace(/[^a-z-]/g, '')}`],
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
    <section className="glass-panel staff-calendar-panel">
      <header className="staff-calendar-heading">
        <div className="staff-calendar-title">
          <span className="staff-calendar-icon"><CalendarDays size={21} /></span>
          <div>
            <h2>{t('staffDashboard.tabCalendar')}</h2>
            <p>{t('staffDashboard.calendarSubtitle')}</p>
          </div>
        </div>
        <span className="staff-calendar-timezone">
          <Clock3 size={15} />
          {settings.timezone || 'America/Montevideo'}
        </span>
      </header>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="dayGridMonth"
        timeZone={settings.timezone || 'America/Montevideo'}
        locale={esLocale}
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        nowIndicator
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
          content.className = 'staff-calendar-event';
          if (arg.timeText) {
            const time = document.createElement('span');
            time.className = 'staff-calendar-event-time';
            time.textContent = arg.timeText;
            content.appendChild(time);
          }
          const title = document.createElement('span');
          title.className = 'staff-calendar-event-title';
          title.textContent = arg.event.title;
          content.appendChild(title);
          const status = document.createElement('span');
          status.className = 'staff-calendar-event-status';
          status.textContent = getAppointmentStatusLabel((arg.event.extendedProps.appt as Appointment).status, t);
          content.appendChild(status);
          return { domNodes: [content] };
        }}
        eventClick={(info) => {
          const appt = info.event.extendedProps.appt as Appointment;
          if (appt) setSelectedAppointment(appt);
        }}
      />
      <div className="staff-calendar-legend" aria-label={t('staffDashboard.calendarStatusLegend')}>
        {[
          ['confirmed', 'var(--info)'],
          ['pending', 'var(--warning)'],
          ['completed', 'var(--success)'],
          ['cancelled', 'var(--danger)'],
          ['no-show', '#a78bfa'],
        ].map(([status, color]) => (
          <span key={status} className="staff-calendar-legend-item">
            <i style={{ backgroundColor: color }} />
            {getAppointmentStatusLabel(status, t)}
          </span>
        ))}
      </div>
    </section>
  );
}
