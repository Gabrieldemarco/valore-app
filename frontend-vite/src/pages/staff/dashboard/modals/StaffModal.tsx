import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';
import { useDashboardCRUD } from '../../dashboard/useDashboardCRUD';
import type { StaffMember } from '../dashboardContext';

export default function StaffModal({ editing, onClose }: { editing: StaffMember | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { saveStaff, uploadStaffPhoto } = useDashboardCRUD();

  const ind = editing?.individual_hours as { startHour?: number; endHour?: number; workDays?: number[] } | null | undefined;
  const [form, setForm] = useState({
    name: editing?.name || '',
    email: editing?.email || '',
    specialties: (editing?.specialties || []).join(', '),
    photo_url: editing?.photo_url || '',
    bio: editing?.bio || '',
    indStart: String(ind?.startHour ?? 9),
    indEnd: String(ind?.endHour ?? 19),
    indWorkDays: ind?.workDays ?? [1, 2, 3, 4, 5],
    useIndividualHours: !!ind,
    commission_type: editing?.commission_type || 'none',
    commission_value: editing?.commission_value ? String(editing.commission_value) : '',
  });
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadStaffPhoto(file);
    if (url) setForm(p => ({ ...p, photo_url: url }));
    setUploading(false);
  };

  const handleSave = async () => {
    const ok = await saveStaff(form, editing);
    if (ok) onClose();
  };

  return (
    <div className="dash-modal-overlay" style={{ display: 'flex' }} onClick={onClose}>
      <div className="dash-modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="dash-modal-header">
          <h3 className="text-gradient">{editing ? t('staffDashboard.staffModalEditTitle') : t('staffDashboard.staffModalNewTitle')}</h3>
          <button onClick={onClose} className="dash-close-btn">✕</button>
        </div>
        <div className="dash-modal-body">
          <div className="dash-form-group">
            <label>{t('staffDashboard.staffModalNameLabel')}</label>
            <input type="text" className="glass-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t('staffDashboard.staffModalNamePlaceholder')} />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.staffModalEmailLabel')}</label>
            <input type="email" className="glass-input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder={t('staffDashboard.staffModalEmailPlaceholder')} />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.staffModalSpecialtiesLabel')}</label>
            <input type="text" className="glass-input" value={form.specialties} onChange={e => setForm(p => ({ ...p, specialties: e.target.value }))} placeholder={t('staffDashboard.staffModalSpecialtiesPlaceholder')} />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.staffModalPhotoLabel')}</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="text" className="glass-input" value={form.photo_url} onChange={e => setForm(p => ({ ...p, photo_url: e.target.value }))} placeholder={t('staffDashboard.staffModalPhotoPlaceholder')} style={{ flex: 1 }} />
              <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} style={{ display: 'none' }} id="staffPhotoInput" />
              <button type="button" className="dash-btn dash-btn-secondary" onClick={() => document.getElementById('staffPhotoInput')?.click()} disabled={uploading}>
                {uploading ? '⏳' : '📷'}{uploading ? t('staffDashboard.uploading') : t('staffDashboard.upload')}
              </button>
            </div>
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.staffModalBioLabel')}</label>
            <textarea className="glass-input" value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder={t('staffDashboard.staffModalBioPlaceholder')} rows={3} style={{ resize: 'vertical' }} />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.staffModalCommissionType')}</label>
            <select className="glass-input" value={form.commission_type} onChange={e => setForm(p => ({ ...p, commission_type: e.target.value }))}>
              <option value="none">{t('staffDashboard.commissionNone')}</option>
              <option value="percentage">{t('staffDashboard.commissionPercentage')}</option>
              <option value="fixed">{t('staffDashboard.commissionFixed')}</option>
            </select>
          </div>
          {form.commission_type !== 'none' && (
            <div className="dash-form-group">
              <label>{t('staffDashboard.staffModalCommissionValue')}</label>
              <input type="number" className="glass-input" value={form.commission_value} onChange={e => setForm(p => ({ ...p, commission_value: e.target.value }))} placeholder={form.commission_type === 'percentage' ? '10' : '0'} min="0" step={form.commission_type === 'percentage' ? '1' : '0.01'} />
            </div>
          )}
          <div className="dash-form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.useIndividualHours} onChange={e => setForm(p => ({ ...p, useIndividualHours: e.target.checked }))} />
              {t('staffDashboard.staffModalCustomHours')}
            </label>
          </div>
          {form.useIndividualHours && (
            <div style={{ background: 'var(--glass-bg)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
              <div className="dash-form-group">
                <label>{t('staffDashboard.staffModalStartHour')}</label>
                <select className="glass-input" value={form.indStart} onChange={e => setForm(p => ({ ...p, indStart: e.target.value }))}>
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}
                </select>
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.staffModalEndHour')}</label>
                <select className="glass-input" value={form.indEnd} onChange={e => setForm(p => ({ ...p, indEnd: e.target.value }))}>
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}
                </select>
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.staffModalWorkDays')}</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { v: 0, l: t('staffDashboard.dayDom') }, { v: 1, l: t('staffDashboard.dayLun') }, { v: 2, l: t('staffDashboard.dayMar') }, { v: 3, l: t('staffDashboard.dayMie') },
                    { v: 4, l: t('staffDashboard.dayJue') }, { v: 5, l: t('staffDashboard.dayVie') }, { v: 6, l: t('staffDashboard.daySab') }
                  ].map(d => (
                    <label key={d.v} className="fs-14">
                      <input type="checkbox" checked={form.indWorkDays.includes(d.v)}
                        onChange={() => setForm(p => ({ ...p, indWorkDays: p.indWorkDays.includes(d.v) ? p.indWorkDays.filter(w => w !== d.v) : [...p.indWorkDays, d.v].sort() }))} />
                      {d.l}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="dash-btn dash-btn-danger" onClick={onClose}>{t('staffDashboard.staffModalCancel')}</button>
            <button className="dash-btn dash-btn-success" onClick={handleSave}>{editing ? t('staffDashboard.staffModalSave') : t('staffDashboard.staffModalCreate')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
