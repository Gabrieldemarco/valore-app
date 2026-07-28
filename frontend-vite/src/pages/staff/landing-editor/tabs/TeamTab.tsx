import { useLandingEditor } from '../landingEditorContext';
import { fixImageUrl, PLACEHOLDER_IMG, DAY_LABELS } from '../landingEditorUtils';
import { User } from 'lucide-react';

export default function TeamTab() {
  const { t, staffList, updateStaff, saveStaff, addStaffUI, setStaffList, handleImageUpload } = useLandingEditor();

  return (
    <div className="card glass-panel p-24">
      <h3 className="text-gradient">{t('staffLandingEditor.teamTitle')}</h3>
      <p className="text-muted-sm mb-16">
        {t('staffLandingEditor.teamHint')}
      </p>
      <div id="staffListContainer">
        {staffList.map((s, i) => {
          const hasCustomHours = !!s.individual_hours;
          const workDays = (s.individual_hours?.workDays || []).map(Number);
          const startH = s.individual_hours?.startHour ?? 9;
          const endH = s.individual_hours?.endHour ?? 19;
          return (
            <div key={i} className="service-item flex-col items-stretch gap-15">
              <div className="flex w-full gap-15">
                <div className="service-fields flex-1">
                  <input type="text" className="glass-input" placeholder={t('staffLandingEditor.staffNamePlaceholder')} value={s.name}
                    onChange={e => updateStaff(i, 'name', e.target.value)} />
                  <input type="email" className="glass-input" placeholder={t('staffLandingEditor.staffEmailPlaceholder')}
                    value={s.email}
                    onChange={e => updateStaff(i, 'email', e.target.value)}
                    readOnly={!!s.id} />
                  <input type="text" className="glass-input" placeholder={t('staffLandingEditor.staffSpecialtiesPlaceholder')}
                    value={(s.specialties || []).join(', ')}
                    onChange={e => updateStaff(i, 'specialties', e.target.value.split(',').map(x => x.trim()))} />
                  <input type="text" className="glass-input" placeholder={t('staffLandingEditor.staffBioPlaceholder')}
                    value={s.bio || ''}
                    onChange={e => updateStaff(i, 'bio', e.target.value)} />
                  <div className="flex-center gap-10 mt-10">
                    {s.photo_url ? (
                      <img src={fixImageUrl(s.photo_url)} alt="" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} />
                    ) : (
                      <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.2)' }}><User size={20} /></div>
                    )}
                    <div className="flex-1">
                      <label className="text-sm-2 text-muted block mb-4">{t('staffLandingEditor.staffPhotoLabel')}</label>
                      <input type="file" accept="image/*" className="glass-input text-sm-2 p-5"
                        onChange={e => handleImageUpload('photo_url', e.target.files?.[0], undefined, i)} />
                    </div>
                  </div>
                  <label className="text-sm mt-8 flex-center cursor-pointer gap-5">
                    <input type="checkbox" checked={s.active !== false}
                      onChange={e => updateStaff(i, 'active', e.target.checked)} />{' '}
                    {t('staffLandingEditor.staffActiveLabel')}
                  </label>
                </div>
                <div className="service-actions self-start">
                  <button className="btn btn-primary" onClick={() => saveStaff(i)}>{t('staffLandingEditor.staffSaveButton')}</button>
                </div>
              </div>
              <div className="pt-12" style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', marginTop: 5 }}>
                <label className="flex-center gap-6 cursor-pointer font-600" style={{ fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={hasCustomHours}
                    onChange={e => {
                      updateStaff(i, 'individual_hours', e.target.checked ? { startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] } : null);
                      setStaffList(prev => [...prev]);
                    }} />
                  {t('staffLandingEditor.staffCustomHoursLabel')}
                </label>
                {hasCustomHours && (
                  <div className="mt-12 p-12" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 }}>
                    <div className="form-group mb-12">
                      <label className="text-sm text-muted block mb-6">{t('staffLandingEditor.staffWorkDaysLabel')}</label>
                      <div className="flex gap-12">
                        {DAY_LABELS.map((day, dIdx) => (
                          <label key={dIdx} className="flex-col items-center gap-4 cursor-pointer">
                            <input type="checkbox" checked={workDays.includes(dIdx)}
                              onChange={e => {
                                const wd = e.target.checked
                                  ? [...(s.individual_hours?.workDays || []), dIdx]
                                  : (s.individual_hours?.workDays || []).filter(d => d !== dIdx);
                                updateStaff(i, 'individual_hours', { ...s.individual_hours!, workDays: wd });
                              }}
                              className="cursor-pointer w-16 h-16" />
                            <span className="text-sm-2 font-600 text-muted">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-16">
                      <div className="form-group flex-1 m-0">
                        <label className="text-sm text-muted block mb-4">{t('staffLandingEditor.staffStartHourLabel')}</label>
                        <input type="number" className="glass-input" min={0} max={23} value={startH}
                          onChange={e => {
                            updateStaff(i, 'individual_hours', { ...s.individual_hours!, startHour: parseInt(e.target.value) });
                            setStaffList(prev => [...prev]);
                          }} />
                      </div>
                      <div className="form-group flex-1 m-0">
                        <label className="text-sm text-muted block mb-4">{t('staffLandingEditor.staffEndHourLabel')}</label>
                        <input type="number" className="glass-input" min={0} max={23} value={endH}
                          onChange={e => {
                            updateStaff(i, 'individual_hours', { ...s.individual_hours!, endHour: parseInt(e.target.value) });
                            setStaffList(prev => [...prev]);
                          }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <button className="btn btn-primary" onClick={addStaffUI}>{t('staffDashboard.staffNewButton')}</button>
    </div>
  );
}
