import { query, queryOne } from '../database';
import config from '../config';
import logger from './logger';

const GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = config.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = config.GOOGLE_CALLBACK_URL;
const SCOPES = 'https://mail.google.com/';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function buildSmtpAuthUrl(state: string): string {
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID!}&redirect_uri=${encodeURIComponent(GOOGLE_CALLBACK_URL!)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
}

async function exchangeCodeForSmtpTokens(code: string): Promise<any> {
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
       redirect_uri: GOOGLE_CALLBACK_URL!,
      grant_type: 'authorization_code',
    }),
  });
  return resp.json();
}

async function getSmtpAccessToken(tenantId: number): Promise<{ accessToken: string; email: string; refreshToken: string | null } | null> {
  const row = await queryOne(
    'SELECT access_token, refresh_token, token_expiry, google_email FROM google_smtp_tokens WHERE tenant_id = $1',
    [tenantId]
  );
  if (!row || !row.access_token) return null;

  if (row.token_expiry && new Date() < new Date(row.token_expiry)) {
    return { accessToken: row.access_token, email: row.google_email || '', refreshToken: row.refresh_token || null };
  }

  if (!row.refresh_token) return null;

  try {
    const resp = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: row.refresh_token,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
      }),
    });
    const data: any = await resp.json();
    if (!data.access_token) {
      logger.error('SMTP token refresh error:', data);
      return null;
    }
    const expiry = new Date(Date.now() + (data.expires_in || 3600) * 1000);
    await query(
      'UPDATE google_smtp_tokens SET access_token = $1, token_expiry = $2 WHERE tenant_id = $3',
      [data.access_token, expiry, tenantId]
    );
    return { accessToken: data.access_token, email: row.google_email || '', refreshToken: row.refresh_token || null };
  } catch (err: any) {
    logger.error('SMTP token refresh error:', err);
    return null;
  }
}

async function getSmtpStatus(tenantId: number): Promise<{ connected: boolean; google_email?: string }> {
  const row = await queryOne('SELECT google_email FROM google_smtp_tokens WHERE tenant_id = $1', [tenantId]);
  if (!row) return { connected: false };
  return { connected: true, google_email: row.google_email };
}

async function deleteSmtpTokens(tenantId: number): Promise<void> {
  await query('DELETE FROM google_smtp_tokens WHERE tenant_id = $1', [tenantId]);
}

async function storeSmtpTokens(tenantId: number, tokenData: any, email: string): Promise<void> {
  const expiry = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;
  await query(
    `INSERT INTO google_smtp_tokens (tenant_id, access_token, refresh_token, token_expiry, google_email)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id)
     DO UPDATE SET access_token = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, google_smtp_tokens.refresh_token),
       token_expiry = EXCLUDED.token_expiry,
       google_email = EXCLUDED.google_email`,
    [tenantId, tokenData.access_token, tokenData.refresh_token || null, expiry, email]
  );
}

export {
  buildSmtpAuthUrl,
  exchangeCodeForSmtpTokens,
  getSmtpAccessToken,
  getSmtpStatus,
  deleteSmtpTokens,
  storeSmtpTokens,
};
