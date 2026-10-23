import { useContext } from 'react';
import DashboardContext from '../dashboardContext';

export function usePlanFeatures() {
  const ctx = useContext(DashboardContext);
  const plan = ctx?.plan;
  const features: string[] = plan?.features || [];
  const currentPlan = plan?.plan || 'free';

  const hasFeature = (feature: string): boolean => {
    if (!plan) return false;
    return features.includes(feature);
  };

  const canAccess = hasFeature;

  const checkLimit = (resource: string): { allowed: boolean; limit: number | null; current: number } => {
    const planLimits: Record<string, { limit: number | null }> = {
      staff: { limit: getResourceLimit(currentPlan, 'staff') },
      services: { limit: getResourceLimit(currentPlan, 'services') },
      products: { limit: getResourceLimit(currentPlan, 'products') },
    };

    const resourceLimit = planLimits[resource]?.limit ?? null;
    return { allowed: resourceLimit === null || resourceLimit > 0, limit: resourceLimit, current: 0 };
  };

  return { hasFeature, canAccess, checkLimit, currentPlan, features };
}

function getResourceLimit(plan: string, resource: 'staff' | 'services' | 'products'): number | null {
  const limits: Record<string, Record<string, number | null>> = {
    free: { staff: 1, services: 5, products: 5 },
    basico: { staff: 1, services: 10, products: 10 },
    estandar: { staff: 3, services: 30, products: 30 },
    premium: { staff: null, services: null, products: null },
  };
  return limits[plan]?.[resource] ?? null;
}
