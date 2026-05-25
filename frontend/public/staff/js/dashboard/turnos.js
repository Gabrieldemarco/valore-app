// @ts-check

/** @param {string} str @returns {string} */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

async function loadAppointments() {
  if (currentView === 'billing') {
    loadInvoices();
    return;
  }

  if (currentView === 'list') {
    const container = document.getElementById('appointmentsContainer');
    if (container) container.innerHTML = '<div class="loading"><div class="loading-spinner"></div>Cargando turnos...</div>';
  } else if (currentView === 'calendar') {
    const cal = document.getElementById('calendar');
    if (cal) {
      cal.innerHTML = '<div class="loading"><div class="loading-spinner"></div>Cargando agenda...</div>';
    }
  }

  try {
    const dateEl = /** @type {HTMLInputElement} */ (document.getElementById('filterDate'));
    const statusEl = /** @type {HTMLSelectElement} */ (document.getElementById('filterStatus'));
    const date = dateEl?.value;
    const status = statusEl?.value;

    let url = `/api/appointments?staffId=${currentStaffFilter}&`;
    if (date && currentView !== 'calendar') url += `date=${date}&`;
    if (status) url += `status=${status}&`;

    const res = await fetch(url, { headers: { 'Authorization': token } });

    if (!res.ok) {
      if (res.status === 401) {
        logout();
        return;
      }
      if (res.status === 403) {
        const errBody = await res.json().catch(() => ({}));
        showToast(errBody.error || 'Activá tu plan en Facturación para continuar.', 'warning');
        switchTab('billing');
        return;
      }
      throw new Error('Error al cargar turnos');
    }

    const data = await res.json();
    allAppointments = data.appointments || data;

    if (currentView === 'list') {
      renderAppointments(allAppointments);
    } else {
      renderCalendar(allAppointments);
    }

    updateStats(allAppointments);

  } catch (err) {
    const container = document.getElementById('appointmentsContainer');
    if (container) {
      container.innerHTML = `<div class="error-state"><h3>❌ Error</h3><p>${escapeHtml(/** @type {Error} */ (err).message)}</p></div>`;
    }
    console.error('Error loading appointments:', err);
  }
}

async function loadStaffFilters() {
  try {
    const res = await fetch('/api/tenant/staff', { headers: { 'Authorization': token } });
    if (!res.ok) throw new Error('No se pudo cargar el equipo');
    const data = await res.json();
    const buttonsContainer = document.getElementById('staffFilterButtons');
    if (!buttonsContainer) return;

    const staffButtons = [{ id: 'all', name: 'Todos' }, ...(data.staff || [])];
    buttonsContainer.innerHTML = staffButtons.map(staff => `
      <button type="button" class="staff-filter-btn${staff.id === 'all' ? ' active' : ''}" data-staff-id="${staff.id}">
        ${staff.name}
      </button>
    `).join('');

    buttonsContainer.querySelectorAll('.staff-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentStaffFilter = /** @type {string} */ (btn.dataset.staffId);
        buttonsContainer.querySelectorAll('.staff-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadAppointments();
      });
    });
  } catch (err) {
    console.error('Error cargando staff filters:', err);
    showToast('Error al cargar filtros de peluqueros', 'error');
  }
}

function filterAppointments() {
  const phoneInput = /** @type {HTMLInputElement} */ (document.getElementById('filterPhone'));
  if (!phoneInput) return;
  const phone = phoneInput.value.toLowerCase();
  const filtered = allAppointments.filter(appt =>
    appt.client_phone && appt.client_phone.toLowerCase().includes(phone)
  );
  renderAppointments(filtered);
}

/**
 * @param {Array} appointments
 */
function renderAppointments(appointments) {
  const container = document.getElementById('appointmentsContainer');
  if (!container) return;

  if (!appointments || appointments.length === 0) {
    container.innerHTML = `
      <div class="empty-state glass-panel">
        <h3 class="text-gradient">📭 No hay turnos</h3>
        <p>No se encontraron turnos para los filtros seleccionados.</p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="appointments-list">
    ${appointments.map(appt => {
      const dateObj = appt.appointment_date ? new Date(appt.appointment_date) : null;
      const time = dateObj ? dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
      const day = dateObj ? dateObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Fecha inválida';

      const phone = appt.client_phone || 'No registrado';
      const phoneDigits = phone && phone.replace ? phone.replace(/\D/g, '') : '';
      const whatsappLink = phoneDigits ? `https://wa.me/${phoneDigits}` : '#';

      const clientName = escapeHtml(appt.client_name || 'Sin nombre');
      const service = escapeHtml(appt.service || 'Sin servicio');
      const duration = appt.service_duration || 0;
      const notes = appt.notes || '';
      const status = appt.status || 'confirmed';
      const staffName = appt.staff_name ? escapeHtml(appt.staff_name) : 'Sin peluquero asignado';

      return `<div class="appointment-card glass-panel glass-panel-hover ${status}">
          <div class="appointment-header">
            <div>
              <div class="appointment-time">${time}</div>
              <div class="appointment-date">${day}</div>
            </div>
            <span class="appointment-status status-${status}">${getStatusText(status)}</span>
          </div>
          <div class="appointment-body">
            <div class="info-group">
              <label>Cliente</label>
              <value>${clientName}</value>
            </div>
            <div class="info-group">
              <label>Teléfono</label>
              <value>${phone !== 'No registrado' ? `<a href="${whatsappLink}" target="_blank">${escapeHtml(phone)}</a>` : escapeHtml(phone)}</value>
            </div>
            <div class="info-group">
              <label>Servicio</label>
              <value>${service} (${duration} min)</value>
            </div>
            <div class="info-group">
              <label>Peluquero</label>
              <value>${staffName}</value>
            </div>
            <div class="info-group">
              <label>Acción</label>
              <value>
                <a href="${whatsappLink}" target="_blank" class="btn-whatsapp">
                  💬 WhatsApp
                </a>
              </value>
            </div>
          </div>
          ${notes ? `<div class="appointment-notes">📝 ${escapeHtml(notes)}</div>` : ''}
          ${status === 'confirmed' ? `<div class="appointment-actions">
            <button class="action-btn btn-complete" onclick="updateStatus(${appt.id}, 'completed')">✓ Completar</button>
            <button class="action-btn btn-cancel" onclick="updateStatus(${appt.id}, 'cancelled')">✕ Cancelar</button>
          </div>` : ''}
        </div>`;
    }).join('')}
    </div>`;
}

/**
 * @param {Array} appointments
 */
function renderCalendar(appointments) {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  const events = appointments.map(appt => {
    const start = appt.appointment_date;
    const duration = appt.service_duration || 30;
    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + duration * 60000);

    let colors = {
      bg: 'rgba(59, 130, 246, 0.15)',
      border: '#3b82f6',
      text: '#93c5fd'
    };

    if (appt.status === 'completed') {
      colors = {
        bg: 'rgba(16, 185, 129, 0.15)',
        border: '#10b981',
        text: '#6ee7b7'
      };
    } else if (appt.status === 'cancelled') {
      colors = {
        bg: 'rgba(239, 68, 68, 0.15)',
        border: '#ef4444',
        text: '#fca5a5'
      };
    } else if (appt.status === 'no-show') {
      colors = {
        bg: 'rgba(239, 68, 68, 0.1)',
        border: '#e11d48',
        text: '#fca5a5'
      };
    } else if (appt.status === 'pending') {
      colors = {
        bg: 'rgba(245, 158, 11, 0.15)',
        border: '#f59e0b',
        text: '#fcd34d'
      };
    }

    return {
      id: appt.id.toString(),
      title: `${appt.client_name} - ${appt.service}`,
      start: start,
      end: endDate.toISOString(),
      backgroundColor: colors.bg,
      borderColor: colors.border,
      textColor: colors.text,
      extendedProps: { appt }
    };
  });

  if (!calendarInstance) {
    calendarInstance = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      locale: 'es',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
      },
      buttonText: {
        today: 'Hoy',
        month: 'Mes',
        week: 'Semana',
        day: 'Día',
        list: 'Agenda'
      },
      firstDay: 1,
      events: events,
      eventClick: function(info) {
        const appt = info.event.extendedProps.appt;
        showAppointmentDetails(appt);
      },
      height: 'auto',
      editable: false,
      selectable: false
    });
    calendarInstance.render();
  } else {
    calendarInstance.removeAllEvents();
    calendarInstance.addEventSource(events);
    calendarInstance.render();
  }
}

/**
 * @param {Object} appt
 */
function showAppointmentDetails(appt) {
  const modal = document.getElementById('appointmentModal');
  const modalBody = document.getElementById('modalBody');
  if (!modal || !modalBody) return;

  const dateObj = appt.appointment_date ? new Date(appt.appointment_date) : null;
  const time = dateObj ? dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const day = dateObj ? dateObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha inválida';

  const phone = appt.client_phone || 'No registrado';
  const phoneDigits = phone && phone.replace ? phone.replace(/\D/g, '') : '';
  const whatsappLink = phoneDigits ? `https://wa.me/${phoneDigits}` : '#';

  const clientName = escapeHtml(appt.client_name || 'Sin nombre');
  const service = escapeHtml(appt.service || 'Sin servicio');
  const duration = appt.service_duration || 0;
  const notes = appt.notes || '';
  const status = appt.status || 'confirmed';
  const modalStaffName = appt.staff_name ? escapeHtml(appt.staff_name) : 'Sin asignar';

  modalBody.innerHTML = `
    <div class="modal-info-grid">
      <div class="modal-info-item">
        <label>Fecha</label>
        <value style="text-transform: capitalize;">${day}</value>
      </div>
      <div class="modal-info-item">
        <label>Hora</label>
        <value>${time}</value>
      </div>
      <div class="modal-info-item">
        <label>Cliente</label>
        <value>${clientName}</value>
      </div>
      <div class="modal-info-item">
        <label>Teléfono</label>
        <value>
          ${phone !== 'No registrado' ? `<a href="${whatsappLink}" target="_blank" style="display: inline-flex; align-items: center; gap: 4px;">${escapeHtml(phone)} 💬</a>` : escapeHtml(phone)}
        </value>
      </div>
      <div class="modal-info-item">
        <label>Servicio</label>
        <value>${service} (${duration} min)</value>
      </div>
      <div class="modal-info-item">
        <label>Peluquero</label>
        <value>${modalStaffName}</value>
      </div>
      <div class="modal-info-item">
        <label>Estado</label>
        <value>
          <span class="appointment-status status-${status}">${getStatusText(status)}</span>
        </value>
      </div>
      ${notes ? `
      <div class="modal-info-item modal-info-full">
        <label>Notas</label>
        <div class="appointment-notes" style="margin-top: 8px; margin-bottom: 0;">📝 ${escapeHtml(notes)}</div>
      </div>
      ` : ''}
    </div>

    <div class="modal-actions">
      <a href="${whatsappLink}" target="_blank" class="btn btn-secondary" style="flex: 1; justify-content: center; background: rgba(37, 211, 102, 0.1); border-color: rgba(37, 211, 102, 0.4); color: #4ade80;">
        💬 WhatsApp
      </a>
      ${status === 'confirmed' ? `
        <button class="btn btn-success" style="flex: 1;" onclick="updateStatusFromModal(${appt.id}, 'completed')">✓ Completar</button>
        <button class="btn btn-danger" style="flex: 1;" onclick="updateStatusFromModal(${appt.id}, 'cancelled')">✕ Cancelar</button>
      ` : ''}
    </div>
  `;

  modal.style.display = 'flex';
}

function closeModal() {
  const modal = document.getElementById('appointmentModal');
  if (modal) modal.style.display = 'none';
}

/**
 * @param {number|string} id
 * @param {string} status
 * @returns {Promise<void>}
 */
async function updateStatusFromModal(id, status) {
  closeModal();
  await updateStatus(id, status);
}

/**
 * @param {number|string} id
 * @param {string} status
 * @returns {Promise<void>}
 */
async function updateStatus(id, status) {
  const action = status === 'completed' ? 'completado' : 'cancelado';
  if (!confirm(`¿Estás seguro de marcar este turno como ${action}?`)) return;

  try {
    const res = await fetch(`/api/appointments/${id}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });

    if (!res.ok) throw new Error('Error al actualizar');

    showToast(`Turno marcado como ${action}`, 'success');
    loadAppointments();
  } catch (err) {
    showToast('Error al actualizar el turno', 'error');
    console.error(err);
  }
}

/**
 * @param {Array} appointments
 */
function updateStats(appointments) {
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.appointment_date?.startsWith(today));
  const pending = appointments.filter(a => a.status === 'confirmed').length;
  const completed = appointments.filter(a => a.status === 'completed').length;
  const cancelled = appointments.filter(a => a.status === 'cancelled').length;
  const total = appointments.length;
  const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

  const elStatToday = document.getElementById('statToday');
  const elStatPending = document.getElementById('statPending');
  const elStatCompleted = document.getElementById('statCompleted');
  const elStatCancellation = document.getElementById('statCancellation');
  if (elStatToday) elStatToday.textContent = String(todayAppointments.length);
  if (elStatPending) elStatPending.textContent = String(pending);
  if (elStatCompleted) elStatCompleted.textContent = String(completed);
  if (elStatCancellation) elStatCancellation.textContent = `${cancellationRate}%`;
}
