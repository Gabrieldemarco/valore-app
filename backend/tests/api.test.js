// tests/api.test.js - Tests básicos de endpoints críticos
const request = require('supertest');
const express = require('express');

// Mock de uuid (ESM-only)
jest.mock('uuid', () => ({ v4: () => 'mock-uuid-1234' }));

// Mock de la base de datos para no conectar a la real
jest.mock('../database', () => ({
  initDB: jest.fn().mockResolvedValue(),
  query: jest.fn(),
  queryOne: jest.fn(),
  pool: { end: jest.fn().mockResolvedValue() }
}));

// Mock de cron-billing
jest.mock('../cron-billing', () => ({
  generateMonthlyInvoices: jest.fn(),
  sendPaymentReminders: jest.fn(),
  suspendOverdueTenants: jest.fn(),
  suspendExpiredFreeTrials: jest.fn()
}));

// Mock de notifications
jest.mock('../services/notifications', () => ({
  sendClientConfirmation: jest.fn().mockResolvedValue({ success: true }),
  notifyStaff: jest.fn().mockResolvedValue({ success: true })
}));

// Set test env
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

const app = require('../server');

describe('API Endpoints - Tests Críticos', () => {

  // ========== HEALTH CHECK ==========
  describe('GET /api/health', () => {
    it('debería responder con status ok', async () => {
      const { query } = require('../database');
      query.mockResolvedValueOnce({ rows: [{ count: '5' }] });
      query.mockResolvedValueOnce({ rows: [{ count: '10' }] });
      query.mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  // ========== VALIDACIÓN DE REGISTRO ==========
  describe('POST /api/register', () => {
    it('debería rechazar username vacío', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({ username: '', password: '123456' });
      expect(res.status).toBe(400);
    });

    it('debería rechazar contraseña corta', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({ username: 'testuser', password: '12' });
      expect(res.status).toBe(400);
    });

    it('debería rechazar sin datos', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  // ========== VALIDACIÓN DE LOGIN ==========
  describe('POST /api/login', () => {
    it('debería rechazar credenciales vacías', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ username: '', password: '' });
      expect(res.status).toBe(400);
    });
  });

  // ========== VALIDACIÓN STAFF LOGIN ==========
  describe('POST /api/staff/login', () => {
    it('debería rechazar email inválido', async () => {
      const res = await request(app)
        .post('/api/staff/login')
        .send({ email: 'no-es-email', password: '123456' });
      expect(res.status).toBe(400);
    });

    it('debería rechazar sin contraseña', async () => {
      const res = await request(app)
        .post('/api/staff/login')
        .send({ email: 'test@test.com', password: '' });
      expect(res.status).toBe(400);
    });
  });

  // ========== VALIDACIÓN STAFF REGISTER ==========
  describe('POST /api/staff/register', () => {
    it('debería rechazar email inválido', async () => {
      const res = await request(app)
        .post('/api/staff/register')
        .send({ businessName: 'Test Pelu', email: 'malo', password: '123456' });
      expect(res.status).toBe(400);
    });

    it('debería rechazar contraseña corta', async () => {
      const res = await request(app)
        .post('/api/staff/register')
        .send({ businessName: 'Test Pelu', email: 'test@test.com', password: '12' });
      expect(res.status).toBe(400);
    });
  });

  // ========== RUTAS PROTEGIDAS SIN TOKEN ==========
  describe('Endpoints protegidos sin token', () => {
    it('GET /api/appointments debería rechazar sin token', async () => {
      const res = await request(app).get('/api/appointments');
      expect(res.status).toBe(401);
    });

    it('GET /api/tenant/me debería rechazar sin token', async () => {
      const res = await request(app).get('/api/tenant/me');
      expect(res.status).toBe(401);
    });
  });

  // ========== VALIDACIÓN DE APPOINTMENT PÚBLICO ==========
  describe('POST /p/:slug/appointments', () => {
    it('debería rechazar datos faltantes', async () => {
      const { queryOne } = require('../database');
      queryOne.mockResolvedValueOnce({
        id: 1, slug: 'test', status: 'active', plan: 'pro',
        brand_primary_color: '#2563eb', brand_secondary_color: '#7c3aed'
      });

      const res = await request(app)
        .post('/p/test/appointments')
        .send({ clientName: 'J' }); // nombre muy corto
      expect(res.status).toBe(400);
    });
  });

  // ========== RUTAS PÚBLICAS ==========
  describe('GET /api/tenants', () => {
    it('debería listar peluquerías', async () => {
      const { query } = require('../database');
      query.mockResolvedValueOnce({
        rows: [{ id: 1, slug: 'demo', business_name: 'Test Pelu', services: ['Corte'] }]
      });

      const res = await request(app).get('/api/tenants');
      expect(res.status).toBe(200);
      expect(res.body.tenants).toBeDefined();
    });
  });
});
