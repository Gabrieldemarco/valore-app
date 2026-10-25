import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../../api/client';
import { useDashboard } from '../dashboardContext';

export function useCategoryCRUD() {
  const { t } = useTranslation();
  const { addToast, loadCategories, loadServices } = useDashboard();

  const saveCategory = useCallback(async (form: { id?: number; name: string; parent_id: number | null }) => {
    if (!form.name.trim()) {
      addToast(t('staffDashboard.toastCategoryNameRequired'), 'error');
      return false;
    }
    try {
      if (form.id) {
        await api.put(`/api/tenant/categories/${form.id}`, { name: form.name, parent_id: form.parent_id });
        addToast(t('staffDashboard.toastCategoryUpdated'), 'success');
      } else {
        await api.post('/api/tenant/categories', { name: form.name, parent_id: form.parent_id });
        addToast(t('staffDashboard.toastCategoryCreated'), 'success');
      }
      loadCategories();
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('staffDashboard.toastCategorySaveError');
      addToast(msg, 'error');
      return false;
    }
  }, [addToast, loadCategories, t]);

  const deleteCategory = useCallback(async (id: number) => {
    if (!confirm(t('staffDashboard.confirmDeleteCategory'))) return false;
    try {
      await api.delete(`/api/tenant/categories/${id}`);
      addToast(t('staffDashboard.toastCategoryDeleted'), 'success');
      loadCategories();
      loadServices();
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('staffDashboard.toastCategoryDeleteError');
      addToast(msg, 'error');
      return false;
    }
  }, [addToast, loadCategories, loadServices, t]);

  return { saveCategory, deleteCategory };
}
