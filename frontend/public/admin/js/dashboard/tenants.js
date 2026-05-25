// @ts-check

async function loadStats() {
  try {
    const res = await fetch('/api/super-admin/stats/billing', { headers: { 'Authorization': token } });
    if (!res.ok) throw new Error('Error al cargar estadísticas');
    const data = await res.json();
    const activeEl = document.getElementById('statActiveTenants');
    const invoicedEl = document.getElementById('statTotalInvoiced');
    const pendingEl = document.getElementById('statPendingInvoices');
    if (activeEl) activeEl.textContent = data.activeTenants ?? '-';
    if (invoicedEl) invoicedEl.textContent = `$${(data.totalInvoiced || 0).toLocaleString('es-AR')}`;
    if (pendingEl) pendingEl.textContent = data.pendingInvoices ?? '-';
  } catch (err) { console.error('Error stats:', err); }

  try {
    const res = await fetch('/api/super-admin/tenants', { headers: { 'Authorization': token } });
    if (!res.ok) throw new Error('Error al cargar tenants');
    const data = await res.json();
    const tenants = /** @type {Tenant[]} */ (data.tenants || []);
    const now = new Date();
    const expired = tenants.filter(t => t.plan === 'free' && t.trial_end_date && new Date(t.trial_end_date) < now);
    const suspended = tenants.filter(t => t.status === 'suspended');
    const expiredEl = document.getElementById('statExpiredTrials');
    const suspendedEl = document.getElementById('statSuspended');
    if (expiredEl) expiredEl.textContent = String(expired.length);
    if (suspendedEl) suspendedEl.textContent = String(suspended.length);
  } catch (err) { console.error('Error extra stats:', err); }
}

async function loadTenants() {
  try {
    const res = await fetch('/api/super-admin/tenants', { headers: { 'Authorization': token } });
    if (!res.ok) throw new Error('Error al cargar peluquerías');
    const data = await res.json();
    allTenants = data.tenants || [];
    renderTenants(allTenants);
  } catch (err) {
    console.error('Error cargando tenants:', err);
    const tbody = document.getElementById('tenantsTable');
    if (tbody) tbody.innerHTML = '<tr class="loading-row"><td colspan="6">Error al cargar peluquerías</td></tr>';
  }
}

function filterTenants() {
  const searchInput = /** @type {HTMLInputElement} */ (document.getElementById('searchInput'));
  const statusSelect = /** @type {HTMLSelectElement} */ (document.getElementById('filterStatus'));
  const planSelect = /** @type {HTMLSelectElement} */ (document.getElementById('filterPlan'));
  const expiredSelect = /** @type {HTMLSelectElement} */ (document.getElementById('filterExpired'));

  const search = searchInput.value.toLowerCase();
  const statusF = statusSelect.value;
  const planF = planSelect.value;
  const expiredF = expiredSelect.value;
  const now = new Date();

  const filtered = allTenants.filter(t => {
    const name = (t.business_name || '').toLowerCase();
    const slug = (t.slug || '').toLowerCase();
    if (search && !name.includes(search) && !slug.includes(search)) return false;
    if (statusF && t.status !== statusF) return false;
    if (planF && t.plan !== planF) return false;
    if (expiredF === 'expired') {
      if (!(t.plan === 'free' && t.trial_end_date && new Date(t.trial_end_date) < now)) return false;
    }
    if (expiredF === 'active_trial') {
      if (!(t.plan === 'free' && t.trial_end_date && new Date(t.trial_end_date) >= now)) return false;
    }
    return true;
  });

  renderTenants(filtered);
}

/** @param {Tenant[]} tenants */
function renderTenants(tenants) {
  const tbody = /** @type {HTMLElement} */ (document.getElementById('tenantsTable'));
  const tableCount = document.getElementById('tableCount');
  if (tableCount) {
    tableCount.textContent = `${tenants.length} peluquería${tenants.length !== 1 ? 's' : ''}`;
  }

  if (!tenants.length) {
    tbody.innerHTML = '<tr class="loading-row"><td colspan="6">No se encontraron peluquerías</td></tr>';
    return;
  }

  const now = new Date();

  tbody.innerHTML = tenants.map(tenant => {
    const trialEnd = tenant.trial_end_date ? new Date(tenant.trial_end_date) : null;
    const isExpired = tenant.plan === 'free' && trialEnd instanceof Date && !isNaN(trialEnd.getTime()) && trialEnd < now;
    const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000) : null;

    const planBadge = tenant.plan === 'pro'
      ? '<span class="badge badge-pro">Pro</span>'
      : '<span class="badge badge-free">Free</span>';

    let statusBadge;
    if (tenant.status === 'suspended') {
      statusBadge = '<span class="badge badge-suspended">🚫 Suspendida</span>';
    } else if (isExpired) {
      statusBadge = '<span class="badge badge-expired">⚠️ Trial Vencido</span>';
    } else {
      statusBadge = '<span class="badge badge-active">✅ Activa</span>';
    }

    let trialInfo = '-';
    if (trialEnd && !isNaN(trialEnd.getTime())) {
      const dateStr = trialEnd.toLocaleDateString('es-AR');
      if (isExpired) {
        trialInfo = `<div class="trial-info expired">🔴 Venció el ${dateStr}</div>`;
      } else if (daysLeft !== null && daysLeft <= 3) {
        trialInfo = `<div class="trial-info warning">⚠️ Vence en ${daysLeft} días (${dateStr})</div>`;
      } else {
        trialInfo = `<div class="trial-info">${dateStr} (${daysLeft} días)</div>`;
      }
    } else if (tenant.plan === 'pro') {
      trialInfo = '<div class="trial-info">Sin vencimiento</div>';
    }

    const safeName = (tenant.business_name || '').replace(/'/g, "\\'");

    let actionBtns = `<button class="btn btn-primary btn-sm" onclick="viewTenant(${tenant.id})">Ver</button>`;
    if (isExpired || tenant.status === 'suspended') {
      actionBtns += ` <button class="btn btn-reactivate btn-sm" onclick="viewTenant(${tenant.id}, true)">🔄 Reactivar</button>`;
    }
    if (tenant.status === 'active' && !isExpired) {
      actionBtns += ` <button class="btn btn-warning btn-sm" onclick="suspendTenantDirect(${tenant.id})">⏸</button>`;
    }
    actionBtns += ` <button class="btn btn-danger btn-sm" onclick="eliminarPeluqueria(${tenant.id}, '${safeName}')">🗑️</button>`;

    return `
      <tr>
        <td><strong style="color:#e2e8f0;">${tenant.business_name || '-'}</strong></td>
        <td><span style="font-size:12px;color:#64748b;">${tenant.slug}</span></td>
        <td>${planBadge}</td>
        <td>${statusBadge}</td>
        <td>${trialInfo}</td>
        <td>${actionBtns}</td>
      </tr>`;
  }).join('');
}

/** @param {number} id @param {boolean} [openReactivation] */
async function viewTenant(id, openReactivation) {
  currentTenantId = id;
  const modal = document.getElementById('tenantModal');
  if (modal) modal.style.display = 'flex';
  const invoiceIdInput = /** @type {HTMLInputElement} */ (document.getElementById('invoiceTenantId'));
  invoiceIdInput.value = String(id);
  switchModalTab('info');

  try {
    const res = await fetch(`/api/super-admin/tenants/${id}`, { headers: { 'Authorization': token } });
    if (!res.ok) throw new Error('Error al cargar datos del tenant');
    const data = await res.json();
    /** @type {Tenant} */
    const tenant = data.tenant;
    currentTenantData = tenant;

    const modalTitle = document.getElementById('modalTitle');
    const detailName = document.getElementById('detailName');
    const detailSlug = document.getElementById('detailSlug');
    const detailEmail = document.getElementById('detailEmail');
    const detailPhone = document.getElementById('detailPhone');
    const detailPlan = document.getElementById('detailPlan');
    const detailStatus = document.getElementById('detailStatus');
    const detailCreatedAt = document.getElementById('detailCreatedAt');
    const detailTrialEnd = document.getElementById('detailTrialEnd');
    const expiredAlert = document.getElementById('expiredAlert');
    const reactivationBox = document.getElementById('reactivationBox');
    const btnSuspend = document.getElementById('btnSuspend');

    if (modalTitle) modalTitle.textContent = tenant.business_name || 'Peluquería';
    if (detailName) detailName.textContent = tenant.business_name || '-';
    if (detailSlug) detailSlug.textContent = tenant.slug || '-';
    if (detailEmail) detailEmail.textContent = tenant.notification_email || '-';
    if (detailPhone) detailPhone.textContent = tenant.business_phone || '-';
    if (detailPlan) detailPlan.textContent = (tenant.plan || 'free').toUpperCase();
    if (detailStatus) detailStatus.textContent = tenant.status || '-';
    if (detailCreatedAt) detailCreatedAt.textContent = tenant.created_at
      ? new Date(tenant.created_at).toLocaleDateString('es-AR') : '-';

    const trialEnd = tenant.trial_end_date ? new Date(tenant.trial_end_date) : null;
    if (detailTrialEnd) {
      detailTrialEnd.textContent = trialEnd
        ? trialEnd.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
        : 'Sin vencimiento';
    }

    const now = new Date();
    const isExpired = tenant.plan === 'free' && trialEnd instanceof Date && !isNaN(trialEnd.getTime()) && trialEnd < now;
    const isSuspended = tenant.status === 'suspended';
    const needsReactivation = isExpired || isSuspended;

    if (expiredAlert) expiredAlert.style.display = needsReactivation ? 'flex' : 'none';
    if (reactivationBox) reactivationBox.style.display = needsReactivation ? 'block' : 'none';
    if (btnSuspend) btnSuspend.style.display = needsReactivation ? 'none' : 'inline-flex';

    if (openReactivation && reactivationBox) {
      reactivationBox.scrollIntoView({ behavior: 'smooth' });
    }

  } catch (err) {
    console.error('Error cargando tenant:', err);
    showToast('Error al cargar detalles', 'error');
  }

  loadInvoices(id);
}

function updateReactivationUI() {
  const checked = document.querySelector('input[name="reactivateMode"]:checked');
  const mode = checked ? /** @type {HTMLInputElement} */ (checked).value : null;
  const daysRow = document.getElementById('daysRow');
  if (daysRow) daysRow.style.display = mode === 'upgrade_pro' ? 'none' : 'flex';
}

async function reactivateTenant() {
  if (!currentTenantId) return;
  const checked = document.querySelector('input[name="reactivateMode"]:checked');
  const mode = checked ? /** @type {HTMLInputElement} */ (checked).value : 'extend_trial';
  const daysInput = /** @type {HTMLInputElement} */ (document.getElementById('extensionDays'));
  const days = parseInt(daysInput.value) || 15;

  const confirmMsg = mode === 'upgrade_pro'
    ? `¿Reactivar y cambiar a plan PRO la cuenta de "${currentTenantData?.business_name}"?`
    : `¿Reactivar "${currentTenantData?.business_name}" con ${days} días adicionales de prueba gratuita?`;

  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetch(`/api/super-admin/tenants/${currentTenantId}/reactivate`, {
      method: 'POST',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, days })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al reactivar');
    }

    const data = await res.json();
    showToast(`✅ ${data.message}`, 'success');
    closeModal();
    loadAll();
  } catch (err) {
    showToast('❌ Error al reactivar: ' + /** @type {Error} */ (err).message, 'error');
    console.error(err);
  }
}

async function suspendTenant() {
  if (!currentTenantId) return;
  if (!confirm(`¿Suspender la cuenta de "${currentTenantData?.business_name}"? Perderán acceso inmediato.`)) return;
  await suspendTenantDirect(currentTenantId);
  closeModal();
}

/** @param {number} id */
async function suspendTenantDirect(id) {
  try {
    const res = await fetch(`/api/super-admin/tenants/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'suspended' })
    });
    if (!res.ok) throw new Error('Error al suspender');
    showToast('⏸ Cuenta suspendida', 'success');
    loadAll();
  } catch (err) { showToast('Error: ' + /** @type {Error} */ (err).message, 'error'); }
}

function deleteTenantModal() {
  if (!currentTenantId || !currentTenantData) return;
  eliminarPeluqueria(currentTenantId, currentTenantData.business_name);
}

/** @param {number} tenantId @param {string} tenantName */
async function eliminarPeluqueria(tenantId, tenantName) {
  const c1 = confirm(`⚠️ ¿Eliminar permanentemente la peluquería "${tenantName}"?\n\nSe borrará TODO: turnos, servicios, staff, facturas.`);
  if (!c1) return;
  const c2 = prompt('🔴 Escribí "ELIMINAR" para confirmar:');
  if (c2 !== 'ELIMINAR') { alert('Cancelado'); return; }

  try {
    const res = await fetch(`/api/super-admin/tenants/${tenantId}`, {
      method: 'DELETE',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Error');
    showToast('🗑️ Peluquería eliminada permanentemente', 'success');
    closeModal();
    loadAll();
  } catch (err) {
    console.error(err);
    showToast('❌ Error al eliminar: ' + /** @type {Error} */ (err).message, 'error');
  }
}
