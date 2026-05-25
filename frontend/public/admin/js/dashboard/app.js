// @ts-check

loadAll();

async function loadAll() {
  await Promise.all([loadStats(), loadTenants(), loadPlanPrices()]);
}

// ====== PLAN PRICES ======
async function loadPlanPrices() {
  try {
    const res = await fetch('/api/super-admin/plan-prices', { headers: { 'Authorization': token } });
    if (!res.ok) throw new Error('Error al cargar precios');
    const data = await res.json();
    renderPlanPrices(/** @type {PlanPrice[]} */ (data.prices || []));
  } catch (err) {
    console.error('Error cargando precios:', err);
    const tbody = document.getElementById('planPricesTable');
    if (tbody) tbody.innerHTML = '<tr class="loading-row"><td colspan="5">Error al cargar precios</td></tr>';
  }
}

/** @param {PlanPrice[]} prices */
function renderPlanPrices(prices) {
  const tbody = /** @type {HTMLElement} */ (document.getElementById('planPricesTable'));

  if (!prices.length) {
    tbody.innerHTML = '<tr class="loading-row"><td colspan="5">No hay precios configurados</td></tr>';
    return;
  }

  /** @type {Record<string, string>} */
  const planNames = {
    pro: 'Profesional',
    enterprise: 'Empresarial'
  };

  tbody.innerHTML = prices.map(price => {
    const updatedAt = price.updated_at ? new Date(price.updated_at).toLocaleDateString('es-AR') : '-';
    return `
      <tr>
        <td><strong style="color:#e2e8f0;">${planNames[price.plan_name] || price.plan_name}</strong></td>
        <td><span style="font-size:16px; font-weight:700; color:#6ee7b7;">$${parseFloat(String(price.price)).toLocaleString('es-AR')}</span></td>
        <td><span style="font-size:12px;color:#64748b;">${price.currency}</span></td>
        <td><span style="font-size:12px;color:#64748b;">${updatedAt}</span></td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="editPlanPrice('${price.plan_name}', ${price.price}, '${price.currency}')">✏️ Editar</button>
        </td>
      </tr>`;
  }).join('');
}

/** @param {string} planName @param {number} currentPrice @param {string} currency */
async function editPlanPrice(planName, currentPrice, currency) {
  const newPrice = prompt(`Nuevo precio para el plan ${planName.toUpperCase()}:`, String(currentPrice));
  if (newPrice === null) return;

  const priceNum = parseFloat(newPrice);
  if (isNaN(priceNum) || priceNum <= 0) {
    showToast('❌ Precio inválido', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/super-admin/plan-prices/${planName}`, {
      method: 'PUT',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: priceNum, currency })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al actualizar precio');
    }

    showToast('✅ Precio actualizado correctamente', 'success');
    loadPlanPrices();
  } catch (err) {
    showToast('❌ Error: ' + /** @type {Error} */ (err).message, 'error');
    console.error(err);
  }
}

// ====== INVOICES ======
/** @param {number} tenantId */
async function loadInvoices(tenantId) {
  try {
    const res = await fetch(`/api/super-admin/tenants/${tenantId}/invoices`, { headers: { 'Authorization': token } });
    if (!res.ok) throw new Error('Error al cargar facturas');
    const data = await res.json();
    const tbody = document.getElementById('invoicesTableBody');
    if (!tbody) return;

    if (!data.invoices || !data.invoices.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#64748b;padding:20px;">Sin facturas</td></tr>';
      return;
    }

    tbody.innerHTML = data.invoices.map(/** @param {Invoice} inv */ inv => `
      <tr>
        <td>${inv.invoice_number}</td>
        <td style="font-weight:700;">$${parseFloat(String(inv.amount)).toLocaleString('es-AR')}</td>
        <td><span class="badge ${inv.status === 'paid' ? 'badge-active' : 'badge-expired'}">${inv.status === 'paid' ? 'Pagada' : 'Pendiente'}</span></td>
        <td>${new Date(inv.issue_date).toLocaleDateString('es-AR')}</td>
        <td>${inv.status !== 'paid' ? `<button class="btn btn-success btn-sm" onclick="payInvoice(${inv.id})">Pagar</button>` : '-'}</td>
      </tr>`).join('');
  } catch (err) { console.error('Error facturas:', err); }
}

// ====== MODAL TABS ======
/** @param {'info'|'invoices'} tabName */
function switchModalTab(tabName) {
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  const tabBtns = document.querySelectorAll('.modal-tab');
  tabBtns.forEach(t => {
    if (t.getAttribute('onclick')?.includes(`'${tabName}'`)) t.classList.add('active');
  });
  const tabInfo = document.getElementById('tab-info');
  const tabInvoices = document.getElementById('tab-invoices');
  if (tabInfo) tabInfo.style.display = tabName === 'info' ? 'block' : 'none';
  if (tabInvoices) tabInvoices.style.display = tabName === 'invoices' ? 'block' : 'none';
}

function closeModal() {
  const modal = document.getElementById('tenantModal');
  if (modal) modal.style.display = 'none';
  currentTenantId = null;
  currentTenantData = null;
}

// Close on backdrop click
const tenantModal = document.getElementById('tenantModal');
if (tenantModal) {
  tenantModal.addEventListener('click', (e) => {
    if (e.target === tenantModal) closeModal();
  });
}

// ====== PAY INVOICE ======
/** @param {number} id */
async function payInvoice(id) {
  try {
    const res = await fetch('/api/payments/mercadopago/create', {
      method: 'POST',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: id })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error');
    }
    const data = await res.json();
    window.location.href = data.init_point;
  } catch (err) { showToast('Error: ' + /** @type {Error} */ (err).message, 'error'); }
}

// ====== NEW INVOICE FORM ======
const newInvoiceForm = document.getElementById('newInvoiceForm');
if (newInvoiceForm) {
  newInvoiceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amountInput = /** @type {HTMLInputElement} */ (document.getElementById('invoiceAmount'));
    const descInput = /** @type {HTMLInputElement} */ (document.getElementById('invoiceDesc'));
    const amount = amountInput.value;
    const desc = descInput.value;
    try {
      const res = await fetch('/api/super-admin/invoices', {
        method: 'POST',
        headers: { 'Authorization': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: currentTenantId, amount, description: desc })
      });
      if (!res.ok) throw new Error('Error al crear factura');
      const form = /** @type {HTMLFormElement} */ (newInvoiceForm);
      form.reset();
      if (currentTenantId) loadInvoices(currentTenantId);
      showToast('✅ Factura creada', 'success');
    } catch (err) { showToast('Error: ' + /** @type {Error} */ (err).message, 'error'); }
  });
}
