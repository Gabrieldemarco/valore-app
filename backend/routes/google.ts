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

  router.post('/auth/google/token', async (req, res) => {
    try {
      const { credential } = req.body;
      if (!credential) return res.status(400).json({ error: 'Credencial requerida' });

      const ticketResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
      const ticket: any = await ticketResp.json();
      if (!ticket.email || ticket.aud !== GOOGLE_CLIENT_ID) {
        return res.status(401).json({ error: 'Credencial inválida' });
      }

      const googleId = ticket.sub;
      const email = ticket.email;
      const name = ticket.name || email;

      let user = await queryOne('SELECT * FROM users WHERE google_id = $1', [googleId]);
      if (!user) {
        const existing = await queryOne('SELECT * FROM users WHERE username = $1', [email]);
        if (existing) {
          await query('UPDATE users SET google_id = $1, email = $2 WHERE id = $3', [googleId, email, existing.id]);
          user = existing;
        } else {
          const randomPass = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), config.BCRYPT_ROUNDS);
          const result = await query(
            'INSERT INTO users (username, password, name, role, google_id, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [email, randomPass, name, 'client', googleId, email]
          );
          user = result.rows[0];
        }
      } else if (!user.email) {
        await query('UPDATE users SET email = $1 WHERE id = $2', [email, user.id]);
        user.email = email;
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        config.JWT_SECRET,
        { expiresIn: '24h', algorithm: config.JWT_ALGORITHM }
      );

      res.json({ token, username: user.username, name: user.name || user.username });
    } catch (err) {
      logger.error('Google token auth error:', err);
      res.status(500).json({ error: 'Error al autenticar con Google' });
    }
  });

  router.get('/auth/google', (req, res) => {
    const redirectUri = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_CALLBACK_URL)}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=select_account`;
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
          await query('UPDATE users SET google_id = $1, email = $2 WHERE id = $3', [userInfo.id, userInfo.email, existing.id]);
          user = existing;
        } else {
          const randomPass = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), config.BCRYPT_ROUNDS);
          const result = await query(
            'INSERT INTO users (username, password, name, role, google_id, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [userInfo.email, randomPass, userInfo.name || userInfo.email, 'client', userInfo.id, userInfo.email]
          );
          user = result.rows[0];
        }
      } else if (!user.email) {
        await query('UPDATE users SET email = $1 WHERE id = $2', [userInfo.email, user.id]);
        user.email = userInfo.email;
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
