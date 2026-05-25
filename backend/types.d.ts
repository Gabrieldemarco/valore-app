import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      tenant?: any;
      tenantStatus?: any;
      tenantTrial?: any;
    }
  }
}
