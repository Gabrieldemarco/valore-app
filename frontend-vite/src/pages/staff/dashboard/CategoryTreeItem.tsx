import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import type { CategoryItem } from './dashboardContext';

export default function CategoryTreeItem({ cat, depth, onEdit, onDelete }: {
  cat: CategoryItem; depth: number; onEdit: (c: CategoryItem) => void; onDelete: (id: number) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const hasChildren = cat.children && cat.children.length > 0;
  return (
    <div className="dash-category-tree-item" style={{ paddingLeft: depth * 24 }}>
      <div className="dash-category-row">
        {hasChildren && (
          <button className="dash-category-toggle" onClick={() => setOpen(o => !o)}>
            <ChevronRight size={14} className={`dash-category-arrow ${open ? 'rotated' : ''}`} />
          </button>
        )}
        {!hasChildren && <span style={{ width: 14, display: 'inline-block' }} />}
        <span className="dash-category-name">{cat.name}</span>
        <div className="dash-category-actions">
          <button className="dash-btn dash-btn-success" style={{ fontSize: 12, padding: '2px 8px' }} onClick={() => onEdit(cat)}>{t('staffDashboard.staffEditButton')}</button>
          <button className="dash-btn dash-btn-danger" style={{ fontSize: 12, padding: '2px 8px' }} onClick={() => onDelete(cat.id)}>{t('staffDashboard.staffDeleteButton')}</button>
        </div>
      </div>
      {hasChildren && open && (
        <div className="dash-category-children">
          {cat.children.map((child: CategoryItem) => <CategoryTreeItem key={child.id} cat={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />)}
        </div>
      )}
    </div>
  );
}
