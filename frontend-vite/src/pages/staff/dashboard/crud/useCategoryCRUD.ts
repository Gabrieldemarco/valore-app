import { useCallback } from 'react';
import { api } from '../../../../api/client';
import { useDashboard } from '../dashboardContext';

export function useCategoryCRUD() {
  const { addToast, loadCategories, loadServices } = useDashboard();

  const saveCategory = useCallback(async (form: { id?: number; name: string; parent_id: number | null }) => {
    if (!form.name.trim()) {
      addToast('El nombre es obligatorio', 'error');
      return false;
    }
    try {
      if (form.id) {
        await api.put(`/api/tenant/categories/${form.id}`, { name: form.name, parent_id: form.parent_id });
        addToast('Categoría actualizada', 'success');
      } else {
        await api.post('/api/tenant/categories', { name: form.name, parent_id: form.parent_id });
        addToast('Categoría creada', 'success');
      }
      loadCategories();
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar categoría';
      addToast(msg, 'error');
      return false;
    }
  }, [addToast, loadCategories]);

  const deleteCategory = useCallback(async (id: number) => {
    if (!confirm('¿Eliminar esta categoría? Los servicios quedarán sin categoría.')) return false;
    try {
      await api.delete(`/api/tenant/categories/${id}`);
      addToast('Categoría eliminada', 'success');
      loadCategories();
      loadServices();
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar';
      addToast(msg, 'error');
      return false;
    }
  }, [addToast, loadCategories, loadServices]);

  return { saveCategory, deleteCategory };
}
