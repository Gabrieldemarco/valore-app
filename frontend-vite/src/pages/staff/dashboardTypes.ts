export interface ServiceImage {
  id: number;
  url: string;
  sort_order: number;
}

export interface ServiceItem {
  id: number;
  name: string;
  duration: number;
  price: number;
  active: boolean;
  image: string | null;
  images?: ServiceImage[];
  category?: string;
  category_id?: number | null;
  category_name?: string | null;
  category_parent_id?: number | null;
  description?: string | null;
}

export interface CategoryItem {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  children: CategoryItem[];
}

export interface TenantSettings {
  business_name: string;
  business_phone: string;
  business_address: string;
  notification_email: string;
  notification_whatsapp: string;
  slug: string;
  opening_hours: Record<string, unknown>;
  [key: string]: unknown;
}

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  specialties: string[];
  photo_url: string | null;
  bio: string | null;
  active: boolean;
}

export interface ClientSummary {
  client_name: string;
  client_phone: string;
  client_email?: string;
  total_appointments: string;
  last_appointment: string;
  first_appointment: string;
}
