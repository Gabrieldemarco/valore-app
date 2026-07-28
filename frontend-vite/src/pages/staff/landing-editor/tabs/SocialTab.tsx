import React from 'react';
import { useLandingEditor } from '../landingEditorContext';

export default function SocialTab() {
  const { t, social, handleSocialField } = useLandingEditor();

  return (
    <div className="card glass-panel p-24">
      <h3 className="text-gradient">{t('staffLandingEditor.socialTitle')}</h3>
      <p className="text-muted-sm mb-16">
        {t('staffLandingEditor.socialHint')}
      </p>
      {[
        { key: 'instagram', label: t('staffLandingEditor.socialInstagram'), placeholder: 'https://instagram.com/tu_cuenta' },
        { key: 'facebook', label: t('staffLandingEditor.socialFacebook'), placeholder: 'https://facebook.com/tu_pagina' },
        { key: 'whatsapp', label: t('staffLandingEditor.socialWhatsApp'), placeholder: 'https://wa.me/123456789' },
        { key: 'tiktok', label: t('staffLandingEditor.socialTikTok'), placeholder: 'https://tiktok.com/@tu_cuenta' },
        { key: 'twitter', label: t('staffLandingEditor.socialTwitter'), placeholder: 'https://twitter.com/tu_cuenta' },
      ].map(sm => (
        <div key={sm.key} className="form-group">
          <label>{sm.label}</label>
          <input type="url" className="glass-input" placeholder={sm.placeholder}
            value={social[sm.key] || ''}
            onChange={e => handleSocialField(sm.key, e.target.value)} />
        </div>
      ))}
    </div>
  );
}
