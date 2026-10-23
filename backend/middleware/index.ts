
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { query, queryOne } from '../database';
import logger from '../services/logger';
import { PLANS, normalizePlan, hasFeature } from '../services/payment-config';
const config = require('../config');

/**
 * Middleware que valida los resultados de express-validator.
 * @type {import('express').RequestHandler}
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array(), error: errors.array()[0]?.msg || 'Datos inválidos' });
  }
  next();
}

/**
 * Crea middleware de autenticación JWT para roles específicos.
 * @param {string[]} allowedRoles
 * @returns {import('express').RequestHandler}
 */
function authenticate(allowedRoles) {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'Token requerido' });
      const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
      const decoded: any = jwt.verify(token, config.JWT_SECRET, { algorithms: [config.JWT_ALGORITHM] });
      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Acceso denegado' });
      }
      req.user = decoded;
      next();
    } catch (err: any) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
  };
}

/** Autenticación para staff y admin */
function authenticateStaff(req, res, next) {
  logger.debug('[AUTH] authenticateStaff called');
  try {
    const authHeader = req.headers.authorization;
    logger.debug('[AUTH] authHeader:', authHeader ? 'present' : 'missing');
    if (!authHeader) return res.status(401).json({ error: 'Token requerido' });
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    logger.debug('[AUTH] token extracted, length:', token.length);
    const decoded: any = jwt.verify(token, config.JWT_SECRET, { algorithms: [config.JWT_ALGORITHM] });
    logger.debug('[AUTH] token verified, role:', decoded.role);
    if (!['staff', 'admin', 'super_admin'].includes(decoded.role)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    req.user = decoded;
    logger.debug('[AUTH] next() called');
    next();
  } catch (err: any) {
    logger.error('[AUTH] error:', err.message);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/** Autenticación para super admin - standalone */
function authenticateSuperAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token requerido' });
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    const decoded: any = jwt.verify(token, config.JWT_SECRET, { algorithms: [config.JWT_ALGORITHM] });
    if (decoded.role !== 'super_admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    req.user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/**
 * Verifica que el tenant del usuario esté activo.
 * @type {import('express').RequestHandler}
 */
async function checkTenantActive(req, res, next) {
  try {
    const tenant = await queryOne(
      'SELECT status, plan FROM tenants WHERE id = $1',
      [req.user.tenant_id]
    );
    if (!tenant) return res.status(404).json({ error: 'Peluquería no encontrada' });
    if (tenant.status !== 'active') {
      return res.status(403).json({ error: 'Cuenta suspendida. Contactá al administrador.' });
    }
    req.tenantStatus = tenant;
    next();
  } catch (err: any) {
    logger.error('Error en checkTenantActive', { error: err.message });
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Verifica que el trial del tenant no haya expirado.
 * @type {import('express').RequestHandler}
 */
async function checkTrialExpiration(req, res, next) {
  try {
    const tenant = await queryOne(
      'SELECT plan, trial_end_date, status FROM tenants WHERE id = $1',
      [req.user.tenant_id]
    );
    if (!tenant) return res.status(404).json({ error: 'Peluquería no encontrada' });
    if (tenant.plan === 'free' && tenant.trial_end_date && new Date() > new Date(tenant.trial_end_date)) {
      return res.status(403).json({ error: 'El período de prueba ha finalizado. Contratá un plan para continuar.' });
    }
    req.tenantTrial = tenant;
    next();
  } catch (err: any) {
    logger.error('Error en checkTrialExpiration', { error: err.message });
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Verifica los límites del plan del tenant.
 * @param {number} tenantId
 * @param {string} resource 'appointments' | 'staff' | 'services' | 'products'
 * @returns {Promise<boolean>}
 */
const RESOURCE_TABLE = { staff: 'staff', services: 'services', products: 'products' };

async function checkPlanLimits(tenantId, resource) {
  try {
    const tenant = await queryOne('SELECT plan FROM tenants WHERE id = $1', [tenantId]);
    if (!tenant) return false;
    const planInfo = PLANS[normalizePlan(tenant.plan)];
    if (!planInfo) return false;
    const limits = planInfo.limits || {};

    if (resource === 'appointments') {
      const limit = limits.appointmentsPerDay;
      if (limit == null) return true;
      const count = await query(
        'SELECT COUNT(*) as total FROM appointments WHERE tenant_id = $1 AND appointment_date::date = CURRENT_DATE',
        [tenantId]
      );
      return parseInt(count.rows[0].total, 10) < limit;
    }

    const table = RESOURCE_TABLE[resource];
    if (!table) return true;
    const limit = limits[resource];
    if (limit == null) return true;

    const count = await query(`SELECT COUNT(*) as total FROM ${table} WHERE tenant_id = $1`, [tenantId]);
    return parseInt(count.rows[0].total, 10) < limit;
  } catch (err: any) {
    logger.error('Error en checkPlanLimits', { error: err.message });
    return false;
  }
}

/**
 * Verifica que el tenant tenga una característica específica según su plan.
 * @param {...string} features
 * @returns {import('express').RequestHandler}
 */
function requireFeature(...features) {
  return (req, res, next) => {
    if (!req.user?.tenant_id) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }
    queryOne('SELECT plan FROM tenants WHERE id = $1', [req.user.tenant_id])
      .then((tenant: any) => {
        if (!tenant) return res.status(404).json({ error: 'Peluquería no encontrada' });
        const hasAny = features.some(f => hasFeature(tenant.plan, f));
        if (!hasAny) {
          return res.status(403).json({ error: `Funcionalidad "${features.join(' o ')}" no disponible en el plan actual` });
        }
        next();
      })
      .catch((err: any) => {
        logger.error('Error en requireFeature', { error: err.message });
        res.status(500).json({ error: 'Error interno' });
      });
  };
}

/**
 * Identifica al tenant por slug, inyecta req.tenant y setea contexto de sesión.
 * @type {import('express').RequestHandler}
 */
async function identifyTenant(req, res, next) {
  try {
    const { slug } = req.params;
    const tenant = await queryOne('SELECT * FROM tenants WHERE slug = $1', [slug]);
    if (!tenant) return res.status(404).json({ error: 'Peluquería no encontrada' });
    req.tenant = tenant;
    await query("SELECT set_config('app.tenant_id', $1::text, true)", [tenant.id]);
    next();
  } catch (err: any) {
    logger.error('Error en identifyTenant', { error: err.message });
    return res.status(500).json({ error: 'Error interno' });
  }
}

export {
  validate,
  authenticate,
  authenticateStaff,
  authenticateSuperAdmin,
  checkTenantActive,
  checkTrialExpiration,
  checkPlanLimits,
  requireFeature,
  identifyTenant,
};
