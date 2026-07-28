import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';
import { useDashboardCRUD } from '../../dashboard/useDashboardCRUD';
import CategoryTreeItem from '../CategoryTreeItem';
import CategoryModal from '../modals/CategoryModal';

export default function CategoriesTab() {
  const { t } = useTranslation();
  const { categories } = useDashboard();
  const { deleteCategory } = useDashboardCRUD();
  const [modal, setModal] = useState<{ open: boolean; editing: { id?: number; name: string; parent_id: number | null } | null }>({ open: false, editing: null });

  return (
    <div className="glass-panel mt-24 p-24">
      <div className="flex-between mb-20">
        <h3 className="text-gradient m-0">{t('staffDashboard.categoriesTitle')}</h3>
        <button className="dash-btn dash-btn-success" onClick={() => setModal({ open: true, editing: { name: '', parent_id: null } })}>{t('staffDashboard.categoriesNewButton')}</button>
      </div>
      {categories.length === 0 ? (
        <div className="dash-empty-state glass-panel">
          <h3 className="text-gradient">{t('staffDashboard.categoriesEmptyTitle')}</h3>
          <p>{t('staffDashboard.categoriesEmptyMessage')}</p>
        </div>
      ) : (
        <div className="dash-category-tree">
          {categories.map(cat => (
            <CategoryTreeItem key={cat.id} cat={cat} depth={0}
              onEdit={c => setModal({ open: true, editing: { id: c.id, name: c.name, parent_id: c.parent_id } })}
              onDelete={deleteCategory} />
          ))}
        </div>
      )}
      {modal.open && <CategoryModal editing={modal.editing} onClose={() => setModal({ open: false, editing: null })} />}
    </div>
  );
}
