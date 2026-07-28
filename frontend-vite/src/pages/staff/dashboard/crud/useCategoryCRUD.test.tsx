import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { api } from '../../../../api/client';
import { useDashboard } from '../dashboardContext';
import { useCategoryCRUD } from './useCategoryCRUD';

vi.mock('../../../../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('../dashboardContext', () => ({
  useDashboard: vi.fn(),
}));

const mockAddToast = vi.fn();
const mockLoadCategories = vi.fn();
const mockLoadServices = vi.fn();

function Harness() {
  const { saveCategory, deleteCategory } = useCategoryCRUD();
  return (
    <div>
      <button onClick={() => saveCategory({ name: 'Cortes', parent_id: null })}>create</button>
      <button onClick={() => saveCategory({ id: 1, name: 'Cortes Edit', parent_id: null })}>update</button>
      <button onClick={() => deleteCategory(1)}>delete</button>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('confirm', vi.fn(() => true));
  (useDashboard as Mock).mockReturnValue({ addToast: mockAddToast, loadCategories: mockLoadCategories, loadServices: mockLoadServices });
});

describe('useCategoryCRUD', () => {
  test('createCategory calls POST then refreshes', async () => {
    const user = userEvent.setup();
    (api.post as Mock).mockResolvedValue({});
    render(<Harness />);
    await user.click(screen.getByText('create'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/tenant/categories', { name: 'Cortes', parent_id: null });
    });
    expect(mockLoadCategories).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith('Categoría creada', 'success');
  });

  test('updateCategory calls PUT then refreshes', async () => {
    const user = userEvent.setup();
    (api.put as Mock).mockResolvedValue({});
    render(<Harness />);
    await user.click(screen.getByText('update'));
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/api/tenant/categories/1', { name: 'Cortes Edit', parent_id: null });
    });
    expect(mockLoadCategories).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith('Categoría actualizada', 'success');
  });

  test('deleteCategory calls DELETE then refreshes categories and services', async () => {
    const user = userEvent.setup();
    (api.delete as Mock).mockResolvedValue({});
    render(<Harness />);
    await user.click(screen.getByText('delete'));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/tenant/categories/1');
    });
    expect(mockLoadCategories).toHaveBeenCalled();
    expect(mockLoadServices).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith('Categoría eliminada', 'success');
  });

  test('shows error toast on API failure', async () => {
    const user = userEvent.setup();
    (api.post as Mock).mockRejectedValue(new Error('DB error'));
    render(<Harness />);
    await user.click(screen.getByText('create'));
    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith('DB error', 'error');
    });
  });
});
