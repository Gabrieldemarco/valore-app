import { query, queryOne } from '../database';
import config from '../config';
import logger from './logger';

const GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = config.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALENDAR_CALLBACK_URL = config.GOOGLE_CALENDAR_CALLBACK_URL;

const SCOPES = 'https://www.googleapis.com/auth/calendar%20https://www.googleapis.com/auth/calendar.events';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

function buildAuthUrl(state: string): string {
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_CALENDAR_CALLBACK_URL)}&response_type=code&scope=${SCOPES}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
}

async function exchangeCodeForTokens(code: string): Promise<any> {
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      redirect_uri: GOOGLE_CALENDAR_CALLBACK_URL!,
      grant_type: 'authorization_code',
    }),
  });
  return resp.json();
}

async function refreshAccessToken(refreshToken: string): Promise<any> {
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });
  return resp.json();
}

async function getValidToken(staffId: number): Promise<string | null> {
  const row = await queryOne('SELECT access_token, refresh_token, token_expiry FROM google_calendar_tokens WHERE staff_id = $1', [staffId]);
  if (!row || !row.access_token) return null;

  if (row.token_expiry && new Date() < new Date(row.token_expiry)) {
    return row.access_token;
  }

  if (!row.refresh_token) return null;

  try {
    const data = await refreshAccessToken(row.refresh_token);
    if (!data.access_token) {
      logger.error('Calendar refresh token error:', data);
      return null;
    }
    const expiry = new Date(Date.now() + (data.expires_in || 3600) * 1000);
    await query(
      'UPDATE google_calendar_tokens SET access_token = $1, token_expiry = $2 WHERE staff_id = $3',
      [data.access_token, expiry, staffId]
    );
    return data.access_token;
  } catch (err: any) {
    logger.error('Calendar token refresh error:', err);
    return null;
  }
}

async function callGoogleApi(accessToken: string, method: string, endpoint: string, body?: any): Promise<any> {
  const url = `${CALENDAR_API}${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  const resp = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google Calendar API error ${resp.status}: ${text}`);
  }
  return resp.json();
}

function appointmentToEvent(appt: any): any {
  const startDate = new Date(appt.appointment_date);
  const endDate = new Date(startDate.getTime() + (appt.service_duration || 30) * 60000);
  return {
    summary: `${appt.service || 'Turno'} - ${appt.client_name}`,
    description: `Cliente: ${appt.client_name}\nTeléfono: ${appt.client_phone || ''}\nEmail: ${appt.client_email || ''}\nNotas: ${appt.notes || ''}`,
    start: { dateTime: startDate.toISOString(), timeZone: 'America/Montevideo' },
    end: { dateTime: endDate.toISOString(), timeZone: 'America/Montevideo' },
    status: appt.status === 'cancelled' ? 'cancelled' : 'confirmed',
  };
}

function eventToAppointment(event: any, tenantId: number): any {
  const start = event.start?.dateTime || event.start?.date;
  const end = event.end?.dateTime || event.end?.date;
  const duration = start && end ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000) : 30;
  const description = event.description || '';
  const phoneMatch = description.match(/Teléfono:\s*([^\n]+)/);
  return {
    google_event_id: event.id,
    client_name: event.summary?.split(' - ')[1] || event.summary || 'Sincronizado',
    client_phone: phoneMatch?.[1]?.trim() || '',
    service: event.summary?.split(' - ')[0] || 'Evento',
    service_duration: duration,
    appointment_date: start || new Date().toISOString(),
    status: event.status === 'cancelled' ? 'cancelled' : 'confirmed',
    notes: description,
  };
}

export async function pushAppointment(staffId: number, appointment: any): Promise<string | null> {
  const token = await getValidToken(staffId);
  if (!token) return null;

  const row = await queryOne('SELECT calendar_id FROM google_calendar_tokens WHERE staff_id = $1', [staffId]);
  const calendarId = row?.calendar_id || 'primary';

  try {
    if (appointment.google_event_id) {
      await callGoogleApi(token, 'PUT', `/calendars/${encodeURIComponent(calendarId)}/events/${appointment.google_event_id}`, appointmentToEvent(appointment));
      return appointment.google_event_id;
    }
    const event = await callGoogleApi(token, 'POST', `/calendars/${encodeURIComponent(calendarId)}/events`, appointmentToEvent(appointment));
    return event.id;
  } catch (err: any) {
    logger.error('Error pushing appointment to Google Calendar:', err);
    return null;
  }
}

export async function deleteAppointmentEvent(staffId: number, googleEventId: string): Promise<boolean> {
  const token = await getValidToken(staffId);
  if (!token) return false;

  const row = await queryOne('SELECT calendar_id FROM google_calendar_tokens WHERE staff_id = $1', [staffId]);
  const calendarId = row?.calendar_id || 'primary';

  try {
    await callGoogleApi(token, 'DELETE', `/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`);
    return true;
  } catch (err: any) {
    logger.error('Error deleting Google Calendar event:', err);
    return false;
  }
}

export async function pullEvents(staffId: number, tenantId: number, fromDate?: string): Promise<number> {
  const token = await getValidToken(staffId);
  if (!token) return 0;

  const row = await queryOne('SELECT calendar_id FROM google_calendar_tokens WHERE staff_id = $1', [staffId]);
  const calendarId = row?.calendar_id || 'primary';
  const timeMin = fromDate || new Date().toISOString();

  try {
    const data = await callGoogleApi(token, 'GET', `/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&orderBy=startTime&singleEvents=true`);
    let imported = 0;
    for (const event of data.items || []) {
      if (!event.id || event.status === 'cancelled') continue;
      const existing = await queryOne('SELECT id FROM appointments WHERE google_event_id = $1 AND tenant_id = $2', [event.id, tenantId]);
      if (existing) continue;
      const apptData = eventToAppointment(event, tenantId);
      await query(
        `INSERT INTO appointments (tenant_id, client_name, client_phone, service, service_duration, appointment_date, status, notes, google_event_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [tenantId, apptData.client_name, apptData.client_phone, apptData.service, apptData.service_duration, apptData.appointment_date, apptData.status, apptData.notes, event.id]
      );
      imported++;
    }
    return imported;
  } catch (err: any) {
    logger.error('Error pulling events from Google Calendar:', err);
    return 0;
  }
}

export async function syncStaffCalendar(staffId: number, tenantId: number): Promise<{ pushed: number; pulled: number }> {
  const token = await getValidToken(staffId);
  if (!token) return { pushed: 0, pulled: 0 };

  let pushed = 0;
  const appointments = await query(
    'SELECT * FROM appointments WHERE tenant_id = $1 AND status != $2 ORDER BY appointment_date',
    [tenantId, 'cancelled']
  );

  for (const appt of appointments.rows) {
    const eventId = await pushAppointment(staffId, appt);
    if (eventId && !appt.google_event_id) {
      await query('UPDATE appointments SET google_event_id = $1 WHERE id = $2', [eventId, appt.id]);
      pushed++;
    }
  }

  const pulled = await pullEvents(staffId, tenantId);

  await query('UPDATE google_calendar_tokens SET last_sync = NOW() WHERE staff_id = $1', [staffId]);

  return { pushed, pulled };
}

export async function getCalendarStatus(staffId: number): Promise<any> {
  const row = await queryOne(
    `SELECT gct.*, s.name as staff_name FROM google_calendar_tokens gct
     JOIN staff s ON s.id = gct.staff_id
     WHERE gct.staff_id = $1`,
    [staffId]
  );
  if (!row) return { connected: false };
  return {
    connected: true,
    google_email: row.google_email,
    sync_enabled: row.sync_enabled,
    last_sync: row.last_sync,
    calendar_id: row.calendar_id,
    staff_name: row.staff_name,
  };
}

export { buildAuthUrl, exchangeCodeForTokens };
