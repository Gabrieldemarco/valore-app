// @ts-check

const API = '';

/** @type {Array} */
let allAppointments = [];
/** @type {Object} */
let currentTenantData = {};
/** @type {string} */
let currentView = 'list';
/** @type {string|number} */
let currentStaffFilter = 'all';
let calendarInstance = null;
let currentPlanInfo = null;

const token = localStorage.getItem('staffToken');
const staffName = localStorage.getItem('staffName');

/**
 * @param {number|string} amount
 * @returns {string}
 */
function formatMoney(amount) {
  const currency = currentPlanInfo?.currency || 'UYU';
  const locale = currentPlanInfo?.locale || 'es-UY';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

/**
 * @param {Function} func
 * @param {number} wait
 * @returns {Function}
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} [type]
 */
function showToast(message, type) {
  if (!type) type = 'success';
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast glass-panel ${type}`;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * @param {string} status
 * @returns {string}
 */
function getStatusText(status) {
  const statuses = {
    'confirmed': '✅ Confirmado',
    'completed': '✓ Completado',
    'cancelled': '✕ Cancelado',
    'no-show': '❌ No asistió',
    'pending': '⏳ Pendiente'
  };
  return statuses[status] || '⏳ Pendiente';
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  const modal = document.getElementById('appointmentModal');
  if (e.target === modal) {
    closeModal();
  }
});
