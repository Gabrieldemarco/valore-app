import { createContext, useContext } from 'react';
import type { EditorTab, CategoryItem, Service, StaffMember, LayoutBlock, TenantData } from './types';

export interface LandingEditorContextValue {
  t: (key: string, options?: Record<string, unknown>) => string;
  activeTab: EditorTab;
  setActiveTab: (tab: EditorTab) => void;

  tenant: TenantData;
  services: Service[];
  categories: CategoryItem[];
  gallery: string[];
  team: unknown[];
  staffList: StaffMember[];
  social: Record<string, string>;
  hours: { startHour: number; endHour: number; workDays: number[] };
  layout: LayoutBlock[];
  dirty: boolean;
  saving: boolean;
  statusMsg: string;
  statusLoading: boolean;
  previewSlug: string | null;
  showMobilePreview: boolean;
  setShowMobilePreview: (v: boolean) => void;
  loaded: boolean;

  handleTenantField: (key: string, value: unknown) => void;
  handleSocialField: (key: string, value: string) => void;
  updateService: (index: number, field: string, value: string | number) => void;
  toggleDeleteService: (index: number) => void;
  addService: () => void;
  setHours: React.Dispatch<React.SetStateAction<{ startHour: number; endHour: number; workDays: number[] }>>;
  toggleDay: (dayIndex: number) => void;
  addGalleryUrl: () => void;
  removeGallery: (index: number) => void;
  setGallery: React.Dispatch<React.SetStateAction<string[]>>;
  updateStaff: (index: number, field: string, value: unknown) => void;
  saveStaff: (index: number) => Promise<void>;
  addStaffUI: () => void;
  setStaffList: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  toggleLayoutSection: (index: number, enabled: boolean) => void;
  removeCustomBlock: (index: number) => void;
  addCustomBlock: () => void;
  setLayout: React.Dispatch<React.SetStateAction<LayoutBlock[]>>;

  handleImageUpload: (targetKey: string, file: File | undefined, serviceIndex?: number, staffIndex?: number) => void;

  setTenant: React.Dispatch<React.SetStateAction<TenantData>>;

  saveChanges: (manual?: boolean) => Promise<void>;
  debounceSave: () => void;

  updateCustomBackgroundAndHero: (overrides?: Record<string, unknown>) => void;
  applyPresetTheme: (primary: string, secondary: string, stylePreset: string) => void;

  showStatus: (msg: string, loading?: boolean) => void;
  updatePreview: () => void;

  modalOpen: boolean;
  setModalOpen: (v: boolean) => void;
  modalLabel: string;
  setModalLabel: (v: string) => void;
  modalTitle: string;
  setModalTitle: (v: string) => void;
  modalContent: string;
  setModalContent: (v: string) => void;
  saveCustomBlockModal: () => void;

  cropFile: File | null;
  cropAspect: number;
  cropTarget: { targetKey?: string; serviceIndex?: number; staffIndex?: number } | null;

  dragIndexRef: React.MutableRefObject<number | null>;
  handleDragStart: (e: React.DragEvent, index: number) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, toIndex: number) => void;
}

export const LandingEditorContext = createContext<LandingEditorContextValue | null>(null);

export function useLandingEditor(): LandingEditorContextValue {
  const ctx = useContext(LandingEditorContext);
  if (!ctx) throw new Error('useLandingEditor must be used within LandingEditorProvider');
  return ctx;
}
