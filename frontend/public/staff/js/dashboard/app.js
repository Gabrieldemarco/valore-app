// @ts-check

if (!token) {
  window.location.href = 'login.html';
}

const userNameEl = document.getElementById('userName');
if (userNameEl) userNameEl.textContent = `👤 ${staffName || 'Staff'}`;

const filterDateEl = /** @type {HTMLInputElement} */ (document.getElementById('filterDate'));
if (filterDateEl) filterDateEl.valueAsDate = new Date();

// Event listeners
const dateFilter = document.getElementById('filterDate');
const statusFilter = document.getElementById('filterStatus');
const phoneFilter = document.getElementById('filterPhone');
if (dateFilter) dateFilter.addEventListener('change', loadAppointments);
if (statusFilter) statusFilter.addEventListener('change', loadAppointments);
if (phoneFilter) phoneFilter.addEventListener('input', debounce(filterAppointments, 300));

(async function initDashboard() {
  try {
    handlePaymentReturn();
    await loadPlanInfo();
    await loadStaffFilters();
    await loadAppointments();
    await loadTrialStatus();
    if (new URLSearchParams(window.location.search).get('billing') === '1') {
      switchTab('billing');
    }
  } catch (err) {
    console.error('Error inicializando dashboard:', err);
  }
})();

function handlePaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get('payment');
  if (!payment) return;
  if (payment === 'success') {
    showToast('¡Pago recibido! Tu plan se activará en unos segundos.', 'success');
    loadPlanInfo();
    loadTrialStatus();
  } else if (payment === 'failure') {
    showToast('El pago no se completó. Podés intentar de nuevo.', 'error');
  } else if (payment === 'pending') {
    showToast('Pago pendiente. Te avisaremos cuando se acredite.', 'warning');
  }
  params.delete('payment');
  const qs = params.toString();
  window.history.replaceState({}, '', window.location.pathname + (qs ? '?' + qs : ''));
}

/**
 * @param {string} view
 */
function switchTab(view) {
  currentView = view;

  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    const onclickAttr = tab.getAttribute('onclick');
    if (onclickAttr && onclickAttr.includes(`'${view}'`)) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  const billingContainer = document.getElementById('billingContainer');
  const appointmentsContainer = document.getElementById('appointmentsContainer');
  const calendarContainer = document.getElementById('calendarContainer');

  if (view === 'billing') {
    if (appointmentsContainer) appointmentsContainer.style.display = 'none';
    if (calendarContainer) calendarContainer.style.display = 'none';
    if (billingContainer) billingContainer.style.display = 'block';
    loadPlanInfo();
    loadInvoices();
  } else if (view === 'calendar') {
    if (billingContainer) billingContainer.style.display = 'none';
    if (appointmentsContainer) appointmentsContainer.style.display = 'none';
    if (calendarContainer) calendarContainer.style.display = 'block';
    loadAppointments();
  } else {
    if (billingContainer) billingContainer.style.display = 'none';
    if (calendarContainer) calendarContainer.style.display = 'none';
    if (appointmentsContainer) appointmentsContainer.style.display = 'block';
    loadAppointments();
  }
}

function exportToCSV() {
  if (!allAppointments.length) {
    showToast('No hay turnos para exportar', 'warning');
    return;
  }

  const headers = ['Fecha', 'Hora', 'Cliente', 'Teléfono', 'Servicio', 'Duración', 'Estado', 'Notas'];
  const rows = allAppointments.map(appt => {
    const date = new Date(appt.appointment_date);
    return [
      date.toLocaleDateString('es-AR'),
      date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      appt.client_name,
      appt.client_phone,
      appt.service,
      appt.service_duration,
      appt.status,
      appt.notes || ''
    ];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `turnos_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();

  showToast('📥 Turnos exportados correctamente', 'success');
}

function logout() {
  localStorage.removeItem('staffToken');
  localStorage.removeItem('staffName');
  localStorage.removeItem('staffRole');
  window.location.href = 'login.html';
}
