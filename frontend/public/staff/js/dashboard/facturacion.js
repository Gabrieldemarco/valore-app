// @ts-check

async function loadPlanInfo() {
  try {
    const res = await fetch('/api/tenant/plan', { headers: { 'Authorization': token } });
    if (!res.ok) { console.warn('Error cargando plan:', res.status); return; }
    const data = await res.json();
    currentPlanInfo = data;
    renderPlanUpgradeCard(data);
  } catch (err) {
    console.error('Error loading plan:', err);
  }
}

/**
 * @param {Object} data
 */
function renderPlanUpgradeCard(data) {
  const card = document.getElementById('planUpgradeCard');
  const statusText = document.getElementById('planStatusText');
  const plansContainer = document.getElementById('plansContainer');
  if (!card || !data?.tenant) return;

  const { tenant, plans } = data;

  if (tenant.plan === 'pro' || tenant.plan === 'enterprise') {
    card.style.display = 'block';
    if (statusText) {
      statusText.textContent = tenant.status === 'active'
        ? `Tenés el plan ${tenant.plan === 'pro' ? 'Profesional' : 'Empresarial'} activo.`
        : 'Tu plan está pendiente de activación.';
    }
    if (plansContainer) plansContainer.innerHTML = '';
    return;
  }

  card.style.display = 'block';

  if (statusText) {
    if (tenant.trialDaysLeft != null && tenant.trialDaysLeft > 0) {
      statusText.textContent = `Estás en prueba gratuita: te quedan ${tenant.trialDaysLeft} día(s). Cuando quieras, activá el plan con Mercado Pago.`;
    } else if (tenant.status === 'suspended' || (tenant.trialDaysLeft != null && tenant.trialDaysLeft <= 0)) {
      statusText.textContent = 'Tu prueba terminó o la cuenta está suspendida. Pagá el plan para volver a usar la agenda.';
    } else {
      statusText.textContent = 'Activá un plan para seguir usando todas las funciones.';
    }
  }

  if (!plansContainer) return;

  const planCards = Object.entries(plans || {}).map(([planKey, plan]) => {
    if (planKey === 'free') return '';
    return `
      <div style="flex:1; min-width:200px; padding:16px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:12px; display:flex; flex-direction:column; gap:12px;">
        <div>
          <strong style="font-size:16px; color:#e2e8f0;">${plan.name}</strong>
          <div style="font-size:20px; font-weight:700; color:#6ee7b7; margin-top:4px;">${formatMoney(plan.price)}/mes</div>
        </div>
        <div style="font-size:13px; color:var(--text-muted); flex:1;">
          ${planKey === 'pro' ? 'Acceso completo después de la prueba gratuita' : 'Funcionalidades avanzadas para negocios en crecimiento'}
        </div>
        <button type="button" class="btn btn-success" onclick="subscribeToPlan('${planKey}')">
          Pagar con Mercado Pago
        </button>
      </div>
    `;
  }).join('');

  plansContainer.innerHTML = planCards;
}

/**
 * @param {string} plan
 * @returns {Promise<void>}
 */
async function subscribeToPlan(plan) {
  try {
    showToast('Redirigiendo a Mercado Pago...', 'warning');
    const res = await fetch('/api/tenant/subscribe', {
      method: 'POST',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: plan || 'pro' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo iniciar el pago');
    window.location.href = data.init_point;
  } catch (err) {
    showToast(/** @type {Error} */ (err).message, 'error');
  }
}

async function loadTrialStatus() {
  try {
    const res = await fetch(`/api/tenant/me`, {
      headers: { 'Authorization': token }
    });
    if (!res.ok) { console.warn('Error cargando trial:', res.status); return; }
    const { tenant } = await res.json();
    if (tenant.plan === 'free' && tenant.trial_end_date) {
      const now = new Date();
      const trialEnd = new Date(tenant.trial_end_date);
      const diffTime = trialEnd.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const badge = document.getElementById('trialBadge');
      if (badge) {
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
          badge.innerHTML = `🚨 Prueba Expirada — Contratar plan`;
        }
        badge.style.cursor = 'pointer';
        badge.title = 'Ir a facturación y pagar con Mercado Pago';
        badge.onclick = () => switchTab('billing');
      }
    }
  } catch (err) {
    console.error('Error loading trial status:', err);
  }
}

async function loadInvoices() {
  const billingContainer = document.getElementById('billingContainer');
  const billingLoading = document.getElementById('billingLoading');
  const billingEmpty = document.getElementById('billingEmpty');
  const billingTableContainer = document.getElementById('billingTableContainer');
  const billingTableBody = document.getElementById('billingTableBody');
  if (!billingContainer || !billingLoading || !billingEmpty || !billingTableContainer || !billingTableBody) return;

  billingContainer.style.display = 'block';
  billingLoading.style.display = 'flex';
  billingEmpty.style.display = 'none';
  billingTableContainer.style.display = 'none';
  billingTableBody.innerHTML = '';

  try {
    const res = await fetch('/api/tenant/invoices', { headers: { 'Authorization': token } });
    if (!res.ok) {
      if (res.status === 401) {
        logout();
        return;
      }
      throw new Error('Error al cargar facturas');
    }

    const { invoices } = await res.json();
    if (!invoices || invoices.length === 0) {
      billingEmpty.style.display = 'block';
      billingTableContainer.style.display = 'none';
      return;
    }

    billingTableBody.innerHTML = invoices.map(inv => `
      <tr>
        <td style="padding:14px 12px;">${inv.invoice_number}</td>
        <td style="padding:14px 12px; text-align:right;">${formatMoney(parseFloat(inv.amount))}</td>
        <td style="padding:14px 12px;">${inv.due_date ? new Date(inv.due_date).toLocaleDateString(currentPlanInfo?.locale || 'es-UY') : 'Sin vencimiento'}</td>
        <td style="padding:14px 12px;"><span style="color:${inv.status === 'paid' ? '#34d399' : '#f59e0b'}; font-weight:700;">${inv.status}</span></td>
        <td style="padding:14px 12px; text-align:center;">
          ${inv.status !== 'paid' ? `<button class="btn btn-success" style="padding:8px 12px;" onclick="payTenantInvoice(${inv.id})">Pagar</button>` : '-'}
        </td>
      </tr>
    `).join('');
    billingTableContainer.style.display = 'block';
  } catch (err) {
    billingEmpty.style.display = 'block';
    const p = billingEmpty.querySelector('p');
    if (p) p.textContent = /** @type {Error} */ (err).message || 'Error al cargar facturas';
    console.error('Error loading invoices:', err);
  } finally {
    billingLoading.style.display = 'none';
  }
}

/**
 * @param {number|string} invoiceId
 * @returns {Promise<void>}
 */
async function payTenantInvoice(invoiceId) {
  try {
    const res = await fetch(`/api/tenant/invoices/${invoiceId}/pay`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'No se pudo iniciar el pago');
    }

    const data = await res.json();
    window.location.href = data.init_point;
  } catch (err) {
    alert('Error al iniciar MercadoPago: ' + /** @type {Error} */ (err).message);
    console.error('payTenantInvoice error:', err);
  }
}
