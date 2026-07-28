import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';
import { useDashboardCRUD } from '../../dashboard/useDashboardCRUD';

export default function CategoryModal({ editing, onClose }: { editing: { id?: number; name: string; parent_id: number | null } | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { categories } = useDashboard();
  const { saveCategory } = useDashboardCRUD();
  const [form, setForm] = useState({ name: editing?.name || '', parent_id: editing?.parent_id ?? null });

  const handleSave = async () => {
    const ok = await saveCategory({ id: editing?.id, ...form });
    if (ok) onClose();
  };

  return (
    <div className="dash-modal-overlay flex" onClick={onClose}>
      <div className="dash-modal-content glass-panel max-w-420" onClick={e => e.stopPropagation()}>
        <div className="dash-modal-header">
          <h3 className="text-gradient">{editing?.id ? t('staffDashboard.categoryModalEditTitle') : t('staffDashboard.categoryModalNewTitle')}</h3>
          <button onClick={onClose} className="dash-close-btn">✕</button>
        </div>
        <div className="dash-modal-body">
          <div className="dash-form-group">
            <label>{t('staffDashboard.categoryModalNameLabel')}</label>
            <input type="text" className="glass-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t('staffDashboard.categoryModalNamePlaceholder')} autoFocus />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.categoryModalParentLabel')}</label>
            <select className="glass-input" value={form.parent_id ?? ''} onChange={e => setForm(p => ({ ...p, parent_id: e.target.value ? parseInt(e.target.value, 10) : null }))}>
              <option value="">{t('staffDashboard.categoryModalNoParent')}</option>
              {categories.filter(c => c.id !== editing?.id).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="dash-btn dash-btn-danger" onClick={onClose}>{t('staffDashboard.categoryModalCancel')}</button>
            <button className="dash-btn dash-btn-success" onClick={handleSave}>{editing?.id ? t('staffDashboard.categoryModalSave') : t('staffDashboard.categoryModalCreate')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
