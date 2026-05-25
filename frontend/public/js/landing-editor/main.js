// @ts-check
/// <reference path="core.js" />
/// <reference path="ui-renderers.js" />

/**
 * @param {boolean} [manual]
 * @returns {Promise<void>}
 */
async function saveChanges(manual = false) {
  if (!state.dirty && !manual) return;
  showToast('Guardando cambios...', true);
  document.querySelectorAll('[data-key]').forEach(el => {
    const key = el.dataset.key;
    state.tenant[key] = el.type === 'checkbox' ? el.checked : el.value;
  });
  const openStart = document.getElementById('openStart');
  const openEnd = document.getElementById('openEnd');
  state.hours = {
    startHour: parseInt(openStart?.value) || 9,
    endHour: parseInt(openEnd?.value) || 19,
    workDays: Array.from(document.querySelectorAll('.day-check input:checked'))
      .map(cb => parseInt(cb.value))
      .filter(n => !isNaN(n))
  };
  const payload = {
    ...state.tenant,
    opening_hours: state.hours,
    landing_gallery: state.gallery,
    landing_team: state.team,
    landing_social_links: state.social,
    services: state.services.filter(s => !s._deleted).map(s => {
      const { _deleted, ...cleanService } = s;
      return cleanService;
    }),
    servicesToDelete: state.services.filter(s => s._deleted && s.id).map(s => s.id),
    landing_layout: state.layout
  };
  if (payload.landing_custom_css) {
    const forbidden = ['javascript:', 'behavior:', 'expression('];
    if (forbidden.some(f => payload.landing_custom_css.toLowerCase().includes(f))) {
      showToast('❌ CSS contiene código prohibido', false);
      return;
    }
  }
  try {
    const res = await fetch(`/api/tenant/settings`, {
      method: 'PUT',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Error al guardar');
    const resData = await res.json();
    if (resData.services) {
      state.services = resData.services.map(s => ({ ...s, _deleted: false }));
      renderServices();
    }
    if (resData.tenant) {
      state.tenant = resData.tenant;
    }
    state.layout = state.tenant.landing_layout || state.layout || [];
    state.dirty = false;
    showToast('✅ Guardado correctamente', false);
    updatePreview();
  } catch (err) {
    showToast('❌ Error al guardar', false);
    console.error(err);
  }
}

/** @returns {Promise<void>} */
async function loadAllData() {
  showToast('Cargando datos...', true);
  try {
    const res = await fetch(`/api/tenant/me`, { headers: { 'Authorization': token } });
    if (!res.ok) throw new Error('Error cargando datos');
    const data = await res.json();
    state.tenant = data.tenant;
    renderTrialStatusBadge(data.tenant);
    state.services = data.services.map(s => ({ ...s, _deleted: false }));
    state.gallery = data.tenant.landing_gallery || [];
    state.team = data.tenant.landing_team || [];
    state.social = data.tenant.landing_social_links || {};
    state.layout = data.tenant.landing_layout || null;
    if (data.tenant.opening_hours) {
      try {
        state.hours = typeof data.tenant.opening_hours === 'string'
          ? JSON.parse(data.tenant.opening_hours)
          : data.tenant.opening_hours;
      } catch (e) { console.error('Error parsing hours', e); }
    }
    const staffRes = await fetch('/api/tenant/staff', { headers: { 'Authorization': token } });
    if(staffRes.ok) {
      const staffData = await staffRes.json();
      state.staffList = staffData.staff || [];
    } else {
      console.warn('Error cargando staff:', staffRes.status);
    }
    populateForms();
    if(typeof renderStaff === 'function') renderStaff();
    renderServices();
    renderGallery();
    renderLayoutEditor();
    showToast('Datos cargados', false);
  } catch (err) {
    showToast('Error: ' + err.message, false);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initHoursUI();
  await loadAllData();
  updatePreview();
});
