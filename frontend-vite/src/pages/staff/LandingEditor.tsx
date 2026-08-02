import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Image, X, Palette } from 'lucide-react';
import LandingEditorProvider from './landing-editor/LandingEditorProvider';
import { useLandingEditor } from './landing-editor/landingEditorContext';
import GeneralTab from './landing-editor/tabs/GeneralTab';
import BrandingTab from './landing-editor/tabs/BrandingTab';
import ServicesTab from './landing-editor/tabs/ServicesTab';
import HoursTab from './landing-editor/tabs/HoursTab';
import GalleryTab from './landing-editor/tabs/GalleryTab';
import TeamTab from './landing-editor/tabs/TeamTab';
import SocialTab from './landing-editor/tabs/SocialTab';
import CSSTab from './landing-editor/tabs/CSSTab';
import LayoutTab from './landing-editor/tabs/LayoutTab';
import ImageCropModal from '../../components/ImageCropModal';
import './landing-editor/editor-tabs.css';
import type { EditorTab } from './landing-editor/types';

const TAB_COMPONENTS: Record<EditorTab, React.FC> = {
  general: GeneralTab,
  branding: BrandingTab,
  services: ServicesTab,
  hours: HoursTab,
  gallery: GalleryTab,
  team: TeamTab,
  social: SocialTab,
  css: CSSTab,
  layout: LayoutTab,
};

function EditorInner() {
  const { t, activeTab, setActiveTab, tenant, saving, saveChanges, statusMsg, statusLoading, showMobilePreview, setShowMobilePreview, previewSlug, cropFile, cropAspect, handleCropApply, cancelCrop } = useLandingEditor();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeSrc = previewSlug ? `/p/${previewSlug}?t=${Date.now()}` : ''; // eslint-disable-line react-hooks/purity

  const tabs: { key: EditorTab; label: string }[] = [
    { key: 'general', label: t('staffLandingEditor.tabGeneral') },
    { key: 'branding', label: t('staffLandingEditor.tabBranding') },
    { key: 'services', label: t('staffDashboard.tabServices') },
    { key: 'hours', label: t('staffLandingEditor.tabHours') },
    { key: 'gallery', label: t('staffLandingEditor.tabGallery') },
    { key: 'team', label: t('staffLandingEditor.tabTeam') },
    { key: 'social', label: t('staffLandingEditor.tabSocial') },
    { key: 'css', label: t('staffLandingEditor.tabCSS') },
    { key: 'layout', label: t('staffLandingEditor.tabLayout') },
  ];

  const trialDaysLeft = (() => {
    const end = tenant.trial_end_date as string;
    if (tenant.plan === 'free' && end) {
      return Math.ceil((new Date(end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)); // eslint-disable-line react-hooks/purity
    }
    return null;
  })();

  const ActiveTabComponent = TAB_COMPONENTS[activeTab];

  return (
    <div style={{ background: 'var(--bg-deep)', color: 'var(--text-main)', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header className="app-header">
        <div className="flex-row-gap">
          <span className="text-1-55"><Palette size={22} /></span>
          <h1 className="text-1-25 font-700 m-0">{t('staffLandingEditor.headerTitle')}</h1>
        </div>
        <div className="flex-row-gap-lg">
          {trialDaysLeft !== null && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
              borderRadius: '20px', fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase',
              background: trialDaysLeft > 5 ? 'rgba(197,168,128,0.08)' : trialDaysLeft > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
              border: trialDaysLeft > 5 ? '1px solid rgba(197,168,128,0.3)' : trialDaysLeft > 0 ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(239,68,68,0.4)',
              color: trialDaysLeft > 5 ? 'var(--primary)' : trialDaysLeft > 0 ? 'var(--warning-dark)' : 'var(--danger-light)',
            }}>
              {trialDaysLeft > 5 ? t('staffLandingEditor.trialMany', { days: trialDaysLeft })
                : trialDaysLeft > 0 ? t('staffLandingEditor.trialFew', { days: trialDaysLeft })
                : t('staffLandingEditor.trialExpired')}
            </div>
          )}
          <Link to="/staff/dashboard" className="btn btn-secondary">{t('staffLandingEditor.dashboardLink')}</Link>
          <button onClick={() => saveChanges(true)} disabled={saving} className="btn btn-primary">{t('staffLandingEditor.saveButton')}</button>
        </div>
      </header>

      <div className="main-container">
        <aside className="editor-pane">
          <nav className="tabs-nav">
            {tabs.map(tab => (
              <button key={tab.key} type="button" className={`tab-btn${activeTab === tab.key ? ' active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="editor-content">
            <ActiveTabComponent />
          </div>
        </aside>

        <section className={`preview-pane${showMobilePreview ? ' mobile-visible' : ''}`}>
          <div className="preview-toolbar">
            <span>{t('staffLandingEditor.previewLabel')}</span>
            <span className="opacity-70">{t('staffLandingEditor.previewUpdated')}</span>
          </div>
          <iframe ref={iframeRef} title={t('staffLandingEditor.preview')} src={iframeSrc} className="w-full h-full border-none bg-deep" />
        </section>

        <button className="mobile-preview-btn" onClick={() => setShowMobilePreview(!showMobilePreview)} aria-label={t('staffLandingEditor.togglePreview')}>
          <Image size={24} />
        </button>
        <button className={`mobile-preview-close${showMobilePreview ? ' mobile-visible' : ''}`} onClick={() => setShowMobilePreview(false)} aria-label={t('staffLandingEditor.closePreview')}>
          <X size={20} />
        </button>
      </div>

      {cropFile && (
        <ImageCropModal
          open
          file={cropFile}
          aspectRatio={cropAspect}
          onApply={handleCropApply}
          onCancel={cancelCrop}
        />
      )}

      <div className={`status-bar${statusMsg ? ' visible' : ''}`} style={statusMsg ? { transform: 'translateY(0)' } : {}}>
        {statusLoading && <div className="spinner"></div>}
        <span>{statusMsg}</span>
      </div>
    </div>
  );
}

export default function LandingEditor() {
  return (
    <LandingEditorProvider>
      {() => <EditorInner />}
    </LandingEditorProvider>
  );
}
