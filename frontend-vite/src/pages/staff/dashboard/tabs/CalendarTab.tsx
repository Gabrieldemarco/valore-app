import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import type { Appointment } from '../dashboardContext';

export default function CalendarTab() {
  const { t } = useTranslation();
  const { appointments, setSelectedAppointment } = useDashboard();

  return (
    <div className="glass-panel" style={{ padding: 28, marginTop: 16, minHeight: 550 }}>
      <FullCalendar
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
        events={appointments.map(a => {
          const start = a.appointment_date || (a.date && a.time ? `${a.date}T${a.time}` : a.date) || undefined;
          const colors: Record<string, { bg: string; border: string }> = {
            confirmed: { bg: 'rgba(34,197,94,0.25)', border: 'var(--success)' },
            completed: { bg: 'rgba(59,130,246,0.2)', border: 'var(--info)' },
            cancelled: { bg: 'rgba(239,68,68,0.2)', border: 'var(--danger)' },
            'no-show': { bg: 'rgba(168,85,247,0.2)', border: 'var(--pending)' },
            pending: { bg: 'rgba(234,179,8,0.25)', border: 'var(--warning)' },
          };
          const c = colors[a.status] || colors.pending;
          return {
            id: String(a.id),
            title: `${a.client_name}${(a.service_name || a.service) ? ` - ${a.service_name || a.service}` : ''}`,
            start,
            backgroundColor: c.bg,
            borderColor: c.border,
            textColor: '#e2e8f0',
            extendedProps: { appt: a },
          };
        })}
        eventContent={(arg) => ({
          html: `<div style="padding:2px 4px;font-size:13px;line-height:1.3">${arg.event.title}</div>`,
        })}
        eventClick={(info) => {
          const appt = info.event.extendedProps.appt as Appointment;
          if (appt) setSelectedAppointment(appt);
        }}
      />
    </div>
  );
}
