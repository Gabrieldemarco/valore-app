import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { query, queryOne } from '../database';
import config from '../config';
import logger from '../services/logger';
import { authenticateStaff } from '../middleware';
import { buildAuthUrl, exchangeCodeForTokens, syncStaffCalendar, getCalendarStatus, pullEvents } from '../services/google-calendar';

const FRONTEND_URL = config.FRONTEND_URL;
const GOOGLE_CALENDAR_CALLBACK_URL = config.GOOGLE_CALENDAR_CALLBACK_URL;

export default function calendarRoutes() {
  const router = Router();

  router.get('/auth/google/calendar', (req, res) => {
    const staffToken = req.query.staff_token as string;
    let staffId: number | null = null;
    if (staffToken) {
      try {
        const decoded: any = jwt.verify(staffToken, config.JWT_SECRET, { algorithms: [config.JWT_ALGORITHM] });
        staffId = decoded.id;
      } catch {}
    }
    if (!staffId) return res.redirect(`${FRONTEND_URL}/staff/dashboard?calendar=error&reason=auth_required`);
    const state = Buffer.from(JSON.stringify({ staff_id: staffId, redirect: '/staff/dashboard' })).toString('base64');
    res.redirect(buildAuthUrl(state));
  });

  router.get('/auth/google/calendar/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;
      if (error) {
        logger.error('Google Calendar auth error:', error);
        return res.redirect(`${FRONTEND_URL}/staff/dashboard?calendar=error&reason=${error}`);
      }
      if (!code) {
        return res.redirect(`${FRONTEND_URL}/staff/dashboard?calendar=error&reason=no_code`);
      }

      const tokenData = await exchangeCodeForTokens(code as string);
      if (!tokenData.access_token) {
        logger.error('Calendar token exchange error:', tokenData);
        return res.redirect(`${FRONTEND_URL}/staff/dashboard?calendar=error&reason=token_exchange`);
      }

      const userInfoResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo: any = await userInfoResp.json();

      const staffToken = (req as any).staffToken || (req as any).query?.staff_token;
      let staffId: number | null = null;

      if (staffToken) {
        try {
          const decoded: any = jwt.verify(staffToken, config.JWT_SECRET, { algorithms: [config.JWT_ALGORITHM] });
          staffId = decoded.id;
        } catch {}
      }

      if (!staffId) {
        try {
          const stateData = JSON.parse(Buffer.from((state as string) || '{}', 'base64').toString('utf-8'));
          if (stateData.staff_id) staffId = stateData.staff_id;
        } catch {}
      }

      if (!staffId) {
        return res.redirect(`${FRONTEND_URL}/staff/dashboard?calendar=error&reason=staff_required`);
      }

      const staff = await queryOne('SELECT id, tenant_id FROM staff WHERE id = $1', [staffId]);
      if (!staff) {
        return res.redirect(`${FRONTEND_URL}/staff/dashboard?calendar=error&reason=staff_not_found`);
      }

      const expiry = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;

      await query(
        `INSERT INTO google_calendar_tokens (staff_id, tenant_id, access_token, refresh_token, token_expiry, calendar_id, google_email, sync_enabled)
         VALUES ($1, $2, $3, $4, $5, 'primary', $6, true)
         ON CONFLICT (staff_id)
         DO UPDATE SET access_token = EXCLUDED.access_token, refresh_token = COALESCE(EXCLUDED.refresh_token, google_calendar_tokens.refresh_token),
           token_expiry = EXCLUDED.token_expiry, google_email = EXCLUDED.google_email, sync_enabled = true`,
        [staffId, staff.tenant_id, tokenData.access_token, tokenData.refresh_token || null, expiry, userInfo.email || '']
      );

      await syncStaffCalendar(staffId, staff.tenant_id);

      res.redirect(`${FRONTEND_URL}/staff/dashboard?calendar=connected`);
    } catch (err: any) {
      logger.error('Calendar callback error:', err);
      res.redirect(`${FRONTEND_URL}/staff/dashboard?calendar=error&reason=callback_error`);
    }
  });

  router.get('/api/calendar/status', authenticateStaff, async (req, res) => {
    try {
      const staffId = (req as any).user?.id;
      if (!staffId) return res.status(401).json({ error: 'Staff required' });
      const status = await getCalendarStatus(staffId);
      res.json(status);
    } catch (err: any) {
      logger.error('Calendar status error:', err);
      res.status(500).json({ error: 'Error getting calendar status' });
    }
  });

  router.post('/api/calendar/sync', authenticateStaff, async (req, res) => {
    try {
      const staffId = (req as any).user?.id;
      const tenantId = (req as any).user?.tenant_id;
      if (!staffId) return res.status(401).json({ error: 'Staff required' });
      const result = await syncStaffCalendar(staffId, tenantId);
      res.json(result);
    } catch (err: any) {
      logger.error('Calendar sync error:', err);
      res.status(500).json({ error: 'Error syncing calendar' });
    }
  });

  router.delete('/api/calendar/disconnect', authenticateStaff, async (req, res) => {
    try {
      const staffId = (req as any).user?.id;
      if (!staffId) return res.status(401).json({ error: 'Staff required' });
      await query('DELETE FROM google_calendar_tokens WHERE staff_id = $1', [staffId]);
      await query('UPDATE appointments SET google_event_id = NULL WHERE tenant_id IN (SELECT tenant_id FROM staff WHERE id = $1)', [staffId]);
      res.json({ success: true });
    } catch (err: any) {
      logger.error('Calendar disconnect error:', err);
      res.status(500).json({ error: 'Error disconnecting calendar' });
    }
  });

  return router;
}
