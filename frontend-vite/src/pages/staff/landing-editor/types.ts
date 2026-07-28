export type EditorTab = 'general' | 'branding' | 'services' | 'hours' | 'gallery' | 'team' | 'social' | 'css' | 'layout';

export interface CategoryItem {
  id: number;
  name: string;
  parent_id: number | null;
  children: CategoryItem[];
}

export interface Service {
  id?: number | null;
  name: string;
  duration: number;
  price: number;
  deposit_amount?: number | null;
  category_id?: number | null;
  image?: string;
  _deleted?: boolean;
}

export interface StaffMember {
  id?: number | null;
  name: string;
  email: string;
  specialties?: string[];
  active?: boolean;
  photo_url?: string | null;
  bio?: string | null;
  individual_hours?: { startHour: number; endHour: number; workDays: number[] } | null;
}

export interface LayoutBlock {
  id: string;
  type: string;
  enabled: boolean;
  label?: string;
  title?: string;
  content?: string;
}

export interface TenantData {
  slug?: string;
  business_name?: string;
  business_address?: string;
  business_phone?: string;
  lat?: number | null;
  lng?: number | null;
  landing_enabled?: boolean;
  landing_description?: string;
  landing_hero_image?: string;
  landing_hero_height?: number;
  landing_hero_width?: number;
  landing_background_color?: string;
  landing_primary_text_color?: string;
  landing_secondary_text_color?: string;
  landing_primary_font?: string;
  landing_secondary_font?: string;
  landing_custom_css?: string;
  landing_gallery?: string[];
  landing_team?: unknown[];
  landing_social_links?: Record<string, string>;
  landing_layout?: LayoutBlock[];
  opening_hours?: unknown;
  brand_primary_color?: string;
  brand_secondary_color?: string;
  brand_logo_url?: string;
  plan?: string;
  trial_end_date?: string;
  [key: string]: unknown;
}
