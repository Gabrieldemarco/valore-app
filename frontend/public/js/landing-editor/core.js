// @ts-check

/**
 * @typedef {Object} AppState
 * @property {Tenant|null} tenant
 * @property {Array<Service>} services
 * @property {Array<string>} gallery
 * @property {Array<Object>} team
 * @property {Array<Staff>} staffList
 * @property {Object<string,string>} social
 * @property {{startHour:number,endHour:number,workDays:number[]}} hours
 * @property {Array<LayoutBlock>|null} layout
 * @property {boolean} dirty
 */

/**
 * @typedef {Object} Tenant
 * @property {number} id
 * @property {string} slug
 * @property {string} plan
 * @property {string|null} trial_end_date
 * @property {string} brand_primary_color
 * @property {string} brand_secondary_color
 * @property {string} landing_custom_css
 * @property {string[]} landing_gallery
 * @property {Object[]} landing_team
 * @property {Object<string,string>} landing_social_links
 * @property {Array<LayoutBlock>|null} landing_layout
 * @property {Object|null} opening_hours
 * @property {string} name
 */

/**
 * @typedef {Object} Service
 * @property {number|null} id
 * @property {string} name
 * @property {number} duration
 * @property {number} price
 * @property {string} image
 * @property {boolean} _deleted
 */

/**
 * @typedef {Object} Staff
 * @property {number|null} id
 * @property {string} name
 * @property {string} email
 * @property {string[]} specialties
 * @property {boolean} active
 * @property {string|null} photo_url
 * @property {string|null} bio
 * @property {Object|null} individual_hours
 */

/**
 * @typedef {Object} LayoutBlock
 * @property {string} id
 * @property {string} type
 * @property {boolean} enabled
 * @property {string} [label]
 * @property {string} [title]
 * @property {string} [content]
 */

// === CONFIGURACIÓN ===
const API = '';
const token = localStorage.getItem('staffToken');
if (!token) window.location.href = 'login.html';

/** @type {AppState} */
let state = {
  tenant: null,
  services: [],
  gallery: [],
  team: [],
  staffList: [],
  social: {},
  hours: { startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] },
  layout: null,
  dirty: false
};

/** @type {number|undefined} */
let saveTimeout;
const BASE_URL = window.location.origin;

/**
 * @param {string|null|undefined} url
 * @returns {string}
 */
function fixImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return BASE_URL + url;
  return url;
}

/**
 * @param {string|null|undefined} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * @param {string} msg
 * @param {boolean} [loading]
 */
function showToast(msg, loading = false) {
  const toast = document.getElementById('statusToast');
  const spinner = document.getElementById('toastSpinner');
  const text = document.getElementById('toastMsg');
  text.textContent = msg;
  spinner.style.display = loading ? 'block' : 'none';
  toast.classList.add('visible');
}

function debounceSave() {
  state.dirty = true;
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => saveChanges(false), 2000);
}

function updatePreview() {
  const iframe = document.getElementById('livePreview');
  const slug = state.tenant?.slug;
  if (!slug) {
    console.warn('⚠️ No hay slug para la preview');
    return;
  }
  const previewUrl = `${window.location.origin}/landing?tenant=${slug}&t=${Date.now()}`;
  console.log('🔄 Actualizando preview a:', previewUrl);
  if (iframe.src !== previewUrl) {
    iframe.src = previewUrl;
  } else {
    try {
      iframe.contentWindow.location.href = previewUrl;
    } catch (e) {
      iframe.src = previewUrl;
    }
  }
}

/**
 * @param {string} tabId
 * @param {HTMLElement|null|undefined} [btnElement]
 */
function showTab(tabId, btnElement) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.remove('hidden');
  if (btnElement) btnElement.classList.add('active');
  if (tabId === 'layout') renderLayoutEditor();
}

function initTabs() { }

/**
 * @param {Tenant} tenant
 */
function renderTrialStatusBadge(tenant) {
  if (tenant.plan === 'free' && tenant.trial_end_date) {
    const now = new Date();
    const trialEnd = new Date(tenant.trial_end_date);
    const diffTime = trialEnd - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const badge = document.getElementById('trialBadge');
    if (badge) {
      badge.classList.remove('hidden');
      badge.style.display = 'inline-flex';
      badge.style.alignItems = 'center';
      badge.style.gap = '6px';
      badge.style.padding = '6px 12px';
      badge.style.borderRadius = '20px';
      badge.style.fontSize = '12px';
      badge.style.fontWeight = '600';
      badge.style.letterSpacing = '0.5px';
      badge.style.textTransform = 'uppercase';
      if (diffDays > 5) {
        badge.style.background = 'rgba(197, 168, 128, 0.08)';
        badge.style.border = '1px solid rgba(197, 168, 128, 0.3)';
        badge.style.color = 'var(--primary)';
        badge.innerHTML = `✨ Período de Prueba: ${diffDays} días restantes`;
      } else if (diffDays > 0) {
        badge.style.background = 'rgba(245, 158, 11, 0.08)';
        badge.style.border = '1px solid rgba(245, 158, 11, 0.4)';
        badge.style.color = '#f59e0b';
        badge.innerHTML = `⚠️ ¡Quedan ${diffDays} días de prueba!`;
      } else {
        badge.style.background = 'rgba(239, 68, 68, 0.08)';
        badge.style.border = '1px solid rgba(239, 68, 68, 0.4)';
        badge.style.color = '#fca5a5';
        badge.innerHTML = `🚨 Prueba Expirada`;
      }
    }
  }
}

function populateForms() {
  document.querySelectorAll('[data-key]').forEach(el => {
    const key = el.dataset.key;
    if (state.tenant && state.tenant[key] !== undefined) {
      if (el.type === 'checkbox') el.checked = state.tenant[key];
      else el.value = state.tenant[key];
    }
  });
  document.querySelectorAll('[data-social]').forEach(el => {
    const key = el.dataset.social;
    if (state.social && state.social[key] !== undefined) {
      el.value = state.social[key];
    }
  });
  const openStart = document.getElementById('openStart');
  const openEnd = document.getElementById('openEnd');
  if (openStart) openStart.value = state.hours?.startHour ?? 9;
  if (openEnd) openEnd.value = state.hours?.endHour ?? 19;
  document.querySelectorAll('.day-check input').forEach(cb => { cb.checked = false; });
  const workDays = state.hours?.workDays;
  if (workDays && Array.isArray(workDays)) {
    workDays.forEach(dayIndex => {
      const checkbox = document.querySelector(`.day-check input[value="${dayIndex}"]`);
      if (checkbox) checkbox.checked = true;
    });
  }
}

function initHoursUI() {
  const days = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const container = document.getElementById('daysGrid');
  if (!container) {
    console.error('❌ No se encontró #daysGrid en el DOM');
    return;
  }
  container.innerHTML = '';
  days.forEach((day, i) => {
    const html = `
      <label class="day-check" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;">
        <input type="checkbox"
               id="day-${i}"
               value="${i}"
               style="width:18px;height:18px;cursor:pointer;"
               onchange="debounceSave()">
        <span for="day-${i}" style="font-size:13px;font-weight:600;color:var(--text-muted);">${day}</span>
      </label>
    `;
    container.innerHTML += html;
  });
  console.log('✅ Checkboxes de días generados (0=D, 1=L, 2=M, 3=M, 4=J, 5=V, 6=S)');
}

/**
 * @param {string} key
 * @param {string} value
 */
function updateSocial(key, value) {
  if (!state.social) state.social = {};
  state.social[key] = value;
  debounceSave();
}

/**
 * @param {number} index
 * @param {string} field
 * @param {string|number} value
 */
function updateService(index, field, value) {
  state.services[index][field] = field === 'duration' || field === 'price' ? (parseFloat(value) || 0) : value;
  debounceSave();
}

/**
 * @param {number} index
 */
function toggleDeleteService(index) {
  const service = state.services[index];
  if (service.id) {
    service._deleted = !service._deleted;
  } else {
    state.services.splice(index, 1);
  }
  renderServices();
  debounceSave();
}

/**
 * @param {number} index
 * @param {string} field
 * @param {*} value
 */
function updateStaff(index, field, value) {
  state.staffList[index][field] = value;
}

/**
 * @param {number} index
 * @param {number} dayIdx
 * @param {boolean} checked
 */
function updateStaffHoursDays(index, dayIdx, checked) {
  const s = state.staffList[index];
  if (!s.individual_hours) s.individual_hours = { startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] };
  if (!s.individual_hours.workDays) s.individual_hours.workDays = [];
  if (checked) {
    if (!s.individual_hours.workDays.includes(dayIdx)) {
      s.individual_hours.workDays.push(dayIdx);
    }
  } else {
    s.individual_hours.workDays = s.individual_hours.workDays.filter(d => d !== dayIdx);
  }
}

/**
 * @param {number} index
 * @param {string} field
 * @param {*} value
 */
function updateStaffHoursField(index, field, value) {
  const s = state.staffList[index];
  if (!s.individual_hours) s.individual_hours = { startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] };
  s.individual_hours[field] = value;
}

/**
 * @param {number} index
 * @param {boolean} enabled
 */
function toggleCustomHours(index, enabled) {
  const s = state.staffList[index];
  if (enabled) {
    s.individual_hours = { startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] };
  } else {
    s.individual_hours = null;
  }
  renderStaff();
}

/**
 * @param {number} index
 * @param {boolean} enabled
 */
function toggleLayoutSection(index, enabled) {
  if (state.layout && state.layout[index]) {
    state.layout[index].enabled = enabled;
    debounceSave();
  }
}

/**
 * @param {number} index
 */
function removeGallery(index) {
  state.gallery.splice(index, 1);
  renderGallery();
  debounceSave();
}
