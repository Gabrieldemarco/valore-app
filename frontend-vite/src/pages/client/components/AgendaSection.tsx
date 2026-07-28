import { useTranslation } from 'react-i18next';
import EmptyState from './EmptyState';

interface AgendaEvent {
  id: number;
  titulo: string;
  fecha: string;
  descripcion?: string;
}

interface AgendaForm {
  titulo: string;
  fecha: string;
  descripcion: string;
}

interface Props {
  events: AgendaEvent[];
  showForm: boolean;
  form: AgendaForm;
  isEditing: boolean;
  onSave: () => void;
  onDelete: (id: number) => void;
  onEdit: (ev: AgendaEvent) => void;
  onCancel: () => void;
  onFormChange: (form: AgendaForm) => void;
  onNew: () => void;
}

export default function AgendaSection({ events, showForm, form, isEditing, onSave, onDelete, onEdit, onCancel, onFormChange, onNew }: Props) {
  const { t } = useTranslation();
  return (
    <div className="glass-panel p-24">
      <div className="flex-between mb-16">
        <h3 className="m-0">{t('clientDashboard.agendaTitle')}</h3>
        <button className="dash-btn dash-btn-primary" onClick={onNew}>
          {t('clientDashboard.agendaNewButton')}
        </button>
      </div>
      {showForm && (
        <div className="card-base mb-16">
          <div className="dash-form-group">
            <label>{t('clientDashboard.agendaTitleLabel')}</label>
            <input type="text" className="glass-input" value={form.titulo} onChange={e => onFormChange({ ...form, titulo: e.target.value })} />
          </div>
          <div className="dash-form-group">
            <label>{t('clientDashboard.agendaDateLabel')}</label>
            <input type="datetime-local" className="glass-input" value={form.fecha} onChange={e => onFormChange({ ...form, fecha: e.target.value })} />
          </div>
          <div className="dash-form-group">
            <label>{t('clientDashboard.agendaDescLabel')}</label>
            <textarea className="glass-input" value={form.descripcion} onChange={e => onFormChange({ ...form, descripcion: e.target.value })} rows={2} />
          </div>
          <div className="flex-gap-8">
            <button className="dash-btn dash-btn-success" onClick={onSave}>
              {isEditing ? t('clientDashboard.agendaSaveButton') : t('clientDashboard.agendaCreateButton')}
            </button>
            <button className="dash-btn dash-btn-danger" onClick={onCancel}>
              {t('clientDashboard.agendaCancelButton')}
            </button>
          </div>
        </div>
      )}
      {events.length === 0 ? (
        <EmptyState message={t('clientDashboard.agendaEmpty')} />
      ) : (
        <div className="dash-table-responsive table-wrapper">
          <table className="table-full">
            <thead>
              <tr>
                <th className="table-cell-left">{t('clientDashboard.agendaTableTitle')}</th>
                <th className="table-cell-left">{t('clientDashboard.agendaTableDate')}</th>
                <th className="table-cell-center">{t('clientDashboard.tableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id}>
                  <td className="table-cell-label">{ev.titulo}</td>
                  <td className="p-12">{new Date(ev.fecha).toLocaleString()}</td>
                  <td className="table-cell-pad-center">
                    <button className="dash-btn dash-btn-success mr-8" onClick={() => onEdit(ev)}>{t('clientDashboard.editButton')}</button>
                    <button className="dash-btn dash-btn-danger" onClick={() => onDelete(ev.id)}>{t('clientDashboard.deleteButton')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
