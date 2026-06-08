// @ts-check
/**
 * Script que inicia el servidor Express para E2E.
 * Se ejecuta como comando webServer de Playwright.
 * Usa TEST_DATABASE_URL del entorno o el default para test.
 */
const path = require('path');

const TEST_DB_URL = process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:orion1@localhost:5432/agenda_app_test';

// Forzar la URL de test (no heredar DATABASE_URL del parent que podría tener .env)
process.env.DATABASE_URL = TEST_DB_URL;
process.env.NODE_ENV = 'e2e';
process.env.JWT_SECRET = 'test-secret-for-e2e';
process.env.SMTP_USER = 'test@velsoie.com';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.PORT = '3000';

const app = require('../server');
