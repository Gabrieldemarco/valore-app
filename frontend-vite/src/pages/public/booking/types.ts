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
