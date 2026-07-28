export interface Tenant {
  id: number;
  business_name: string;
  slug: string;
  notification_email: string;
  plan: string;
  status: string;
  trial_end_date: string | null;
  created_at: string;
}

export interface TenantDetail extends Tenant {
  business_phone: string;
  trial_expired: boolean;
  trial_days_left: number;
  [key: string]: unknown;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  amount: number;
  status: string;
  issue_date: string;
  payment_method: string | null;
  paid_date: string | null;
}

export interface Payment {
  id: number;
  invoice_id: number;
  amount: number;
  currency: string;
  method: string;
  mp_payment_id: string | null;
  status: string;
  created_at: string;
  invoice_number: string | null;
  invoice_description: string | null;
}

export interface Stats {
  totalInvoiced: number;
  activeTenants: number;
  pendingInvoices: number;
}

export interface TwilioConfig {
  account_sid: string;
  auth_token: string;
  from: string;
}
