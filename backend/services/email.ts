
// services/email.js - Transporter de email unificado
import nodemailer from 'nodemailer';
require('dotenv').config();

let transporter: import('nodemailer').Transporter | null = null;

function createEmailTransporter(): import('nodemailer').Transporter {
  if (transporter) return transporter;
  if (process.env.SMTP_SERVICE) {
    transporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    const secure = process.env.SMTP_SECURE === 'true';
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export default createEmailTransporter;
