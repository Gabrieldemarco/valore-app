export interface TenantData {
  business_name: string;
  slug: string;
  category?: string;
  landing_description: string | null;
  landing_hero_image: string | null;
  landing_gallery: unknown[] | null;
  landing_team: unknown[] | null;
  landing_social_links: Record<string, string> | null;
  landing_custom_css: string | null;
  landing_layout: LayoutBlock[] | null;
  brand_primary_color: string | null;
  brand_secondary_color: string | null;
  brand_logo_url: string | null;
  business_phone: string | null;
  business_address: string | null;
  opening_hours: Record<string, unknown> | null;
  landing_background_color: string | null;
  landing_hero_height: number | null;
  landing_hero_width: number | null;
  landing_primary_text_color: string | null;
  landing_secondary_text_color: string | null;
  landing_primary_font: string | null;
  landing_secondary_font: string | null;
}

export interface LayoutBlock {
  id: string;
  type: string;
  enabled: boolean;
  label?: string;
  title?: string;
  content?: string;
}

export interface ServiceImage {
  id: number;
  url: string;
  sort_order: number;
}

export interface ServiceItem {
  id: number;
  name: string;
  duration: number;
  price: number | string | null;
  category: string;
  category_id: number | null;
  category_name: string | null;
  category_parent_id: number | null;
  description: string | null;
  image: string | null;
  images?: ServiceImage[];
}

export interface ReviewItem {
  id: number;
  client_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface TeamItem {
  name: string;
  specialties?: string[];
  role?: string;
  bio?: string | null;
  photo_url?: string | null;
  photo?: string;
}

export interface StaffMember {
  id: number;
  name: string;
  photo_url: string | null;
  bio: string | null;
  specialties: string[];
}

export interface SlotItem {
  time: string;
  available: boolean;
}
