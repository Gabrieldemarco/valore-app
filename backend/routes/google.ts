import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, queryOne } from '../database';
import config from '../config';
import logger from '../services/logger';

const GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = config.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = config.GOOGLE_CALLBACK_URL;
const FRONTEND_URL = config.FRONTEND_URL;

export default function googleAuth() {
  const router = Router();

  router.get('/auth/google', (req, res) => {
    const redirectUri = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_CALLBACK_URL)}&response_type=code&scope=openid%20email%20profile&access_type=offline`;
    res.redirect(redirectUri);
  });

  router.get('/auth/google/callback', async (req, res) => {
    try {
      const { code } = req.query;
      if (!code) {
        return res.redirect(`${FRONTEND_URL}/client/login?error=google_auth_failed`);
      }

      const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code as string,
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          redirect_uri: GOOGLE_CALLBACK_URL!,
          grant_type: 'authorization_code',
        }),
      });
      const tokenData: any = await tokenResp.json();
      if (!tokenData.access_token) {
        logger.error('Google token error:', tokenData);
        return res.redirect(`${FRONTEND_URL}/client/login?error=google_token_error`);
      }

      const userInfoResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo: any = await userInfoResp.json();
      if (!userInfo.email) {
        return res.redirect(`${FRONTEND_URL}/client/login?error=google_email_required`);
      }

      let user = await queryOne('SELECT * FROM users WHERE google_id = $1', [userInfo.id]);
      if (!user) {
        const existing = await queryOne('SELECT * FROM users WHERE username = $1', [userInfo.email]);
        if (existing) {
          await query('UPDATE users SET google_id = $1 WHERE id = $2', [userInfo.id, existing.id]);
          user = existing;
        } else {
          const randomPass = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), config.BCRYPT_ROUNDS);
          const result = await query(
            'INSERT INTO users (username, password, name, role, google_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [userInfo.email, randomPass, userInfo.name || userInfo.email, 'client', userInfo.id]
          );
          user = result.rows[0];
        }
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        config.JWT_SECRET,
        { expiresIn: '24h', algorithm: config.JWT_ALGORITHM }
      );

      res.redirect(`${FRONTEND_URL}/client/dashboard?token=${token}&name=${encodeURIComponent(user.name || user.username)}`);
    } catch (err) {
      logger.error('Google auth error:', err);
      res.redirect(`${FRONTEND_URL}/client/login?error=google_auth_error`);
    }
  });

  return router;
}
