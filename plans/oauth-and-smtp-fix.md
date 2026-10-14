# Plan: Fix Google OAuth Error 5 and SMTP Authentication

## Current Status
- Security headers fixed in `server.ts` (Referrer-Policy, Cross-Origin-Opener-Policy)
- SMTP credentials updated in `backend/.env` (velsoie09@gmail.com, kkgssqsmbtlcsvfj)
- Backend restarted on VPS
- Service worker dependencies fixed
- **Issues remaining:**
  1. Google OAuth error code 5 persists (missing authorized JavaScript origins)
  2. SMTP authentication fails with "Invalid login: 535-5.7.8 Username and Password not accepted"
  3. Staff notifications not being sent from `backend/cron-billing.ts`

## Steps

### Step 1: Google OAuth 2.0 - Add Authorized JavaScript Origins
- Go to Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 client ID
- Add `https://velsoie.com` and `https://www.velsoie.com` under "Authorized JavaScript origins"
- Publish the OAuth consent screen (currently in Testing/Development mode)

### Step 2: SMTP Authentication - Debug Connection
- Verify SMTP server connectivity from the container
- Confirm credentials in `backend/.env` are correct
- Check if app password is valid for Gmail
- Ensure port 587 (TLS) or 465 (SSL) is accessible

### Step 3: Staff Notifications - Verify Flow
- Ensure `notifyStaff` function in `backend/services/notifications.ts` is properly exported
- Verify `cron-billing.ts` correctly calls `notifyStaff`
- Test the notification flow manually with a sample appointment

## Validation
- After OAuth fix: Google OAuth flows should succeed
- After SMTP fix: SMTP authentication should succeed
- After staff notifications: `sendAppointmentReminders` should send emails/WhatsApp alerts

## Risks
- Changing OAuth origins may cause temporary disruption if misconfigured
- SMTP credentials may be invalid or blocked by Gmail
- Staff notifications may fail if tenant data is incomplete

## Owner
Kilo (interactive CLI assistant)
