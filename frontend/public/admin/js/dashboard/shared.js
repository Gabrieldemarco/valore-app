// @ts-check

const token = localStorage.getItem('superAdminToken');
if (!token) window.location.href = 'login.html';

const userNameEl = document.getElementById('userName');
if (userNameEl) {
  userNameEl.textContent = `👤 ${localStorage.getItem('superAdminName') || 'Admin'}`;
}

/**
 * @typedef {Object} Tenant
 * @property {number} id
 * @property {string} business_name
 * @property {string} [slug]
 * @property {string} [notification_email]
 * @property {string} [business_phone]
 * @property {string} [business_address]
 * @property {'free'|'pro'} [plan]
 * @property {'active'|'suspended'} [status]
 * @property {string} [trial_end_date]
 * @property {string} [created_at]
 * @property {string} [landing_description]
 * @property {string} [brand_logo_url]
 * @property {string} [landing_hero_image]
 */

/**
 * @typedef {Object} Invoice
 * @property {number} id
 * @property {string} invoice_number
 * @property {number} amount
 * @property {'paid'|'pending'} status
 * @property {string} issue_date
 */

/**
 * @typedef {Object} PlanPrice
 * @property {string} plan_name
 * @property {number} price
 * @property {string} currency
 * @property {string} [updated_at]
 */

/** @type {number|null} */
let currentTenantId = null;

/** @type {Tenant|null} */
let currentTenantData = null;

/** @type {Tenant[]} */
let allTenants = [];

/**
 * @param {string} message
 * @param {'success'|'error'} [type]
 */
function showToast(message, type) {
  if (!type) type = 'success';
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-msg">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function logout() {
  localStorage.removeItem('superAdminToken');
  localStorage.removeItem('superAdminName');
  window.location.href = 'login.html';
}
