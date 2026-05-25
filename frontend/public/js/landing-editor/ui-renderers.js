// @ts-check
/// <reference path="core.js" />

/** @type {Object<string,string>} */
var SECTION_LABELS = {
  hero: '🏠 Hero (Portada)',
  servicios: '✂️ Servicios',
  galeria: '📷 Galería',
  equipo: '👥 Equipo',
  reservar: '📅 Reserva de Turnos'
};

/** @returns {Array<LayoutBlock>} */
function getDefaultLayout() {
  return [
    { id: 'hero', type: 'hero', enabled: true },
    { id: 'servicios', type: 'services', enabled: true },
    { id: 'galeria', type: 'gallery', enabled: true },
    { id: 'equipo', type: 'team', enabled: true },
    { id: 'reservar', type: 'booking', enabled: true }
  ];
}

/** @returns {void} */
function renderLayoutEditor() {
  var container = document.getElementById('layoutSorter');
  if (!container) return;
  var layout = state.layout && state.layout.length ? state.layout : getDefaultLayout();
  state.layout = layout;
  container.innerHTML = '';
  layout.forEach(function (item, index) {
    var isCustom = item.type === 'custom';
    var label = isCustom ? (item.label || 'Bloque personalizado') : (SECTION_LABELS[item.id] || item.id);
    var div = document.createElement('div');
    div.className = 'layout-item';
    div.draggable = true;
    div.dataset.index = index;
    div.className = 'layout-item';
    div.innerHTML =
      '<span class="drag-handle">⠿</span>' +
      '<label class="layout-label">' +
      '<input type="checkbox" ' + (item.enabled !== false ? 'checked' : '') +
      ' onchange="toggleLayoutSection(' + index + ', this.checked)"> ' + label + '</label>' +
      (isCustom ? '<button class="btn btn-danger btn-icon" onclick="removeCustomBlock(' + index + ')">✕</button>' : '');
    container.appendChild(div);
  });
}

/** @returns {void} */
function addCustomBlock() {
  document.getElementById('modalBlockLabel').value = '';
  document.getElementById('modalBlockTitle').value = '';
  document.getElementById('modalBlockContent').value = '';
  document.getElementById('customBlockModal').classList.add('open');
}

/** @returns {void} */
function closeCustomBlockModal() {
  document.getElementById('customBlockModal').classList.remove('open');
}

function saveCustomBlockModal() {
  var label = document.getElementById('modalBlockLabel').value.trim();
  var title = document.getElementById('modalBlockTitle').value.trim();
  var content = document.getElementById('modalBlockContent').value.trim();
  if (!label && !content) { alert('Poné al menos un nombre o el código HTML.'); return; }
  var id = 'custom-' + Date.now();
  state.layout.push({ id: id, type: 'custom', label: label || 'Sin nombre', enabled: true, title: title, content: content });
  closeCustomBlockModal();
  renderLayoutEditor();
  debounceSave();
}

/** @param {number} index */
function removeCustomBlock(index) {
  if (state.layout && state.layout[index]) {
    state.layout.splice(index, 1);
    renderLayoutEditor();
    debounceSave();
  }
}

/** @param {DragEvent} e */
document.addEventListener('dragstart', function (e) {
  var item = e.target.closest('.layout-item');
  if (item) e.dataTransfer.setData('text/plain', item.dataset.index);
});
document.addEventListener('dragover', function (e) {
  var item = e.target.closest('.layout-item');
  if (item) { e.preventDefault(); item.style.borderColor = 'var(--primary)'; }
});
document.addEventListener('dragleave', function (e) {
  var item = e.target.closest('.layout-item');
  if (item) item.style.borderColor = '';
});
document.addEventListener('drop', function (e) {
  var item = e.target.closest('.layout-item');
  var fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
  if (item && !isNaN(fromIndex)) {
    e.preventDefault();
    var toIndex = parseInt(item.dataset.index, 10);
    if (fromIndex !== toIndex && state.layout) {
      var moved = state.layout.splice(fromIndex, 1)[0];
      state.layout.splice(toIndex, 0, moved);
      renderLayoutEditor();
      debounceSave();
    }
  }
});

var origRenderLayout = renderLayoutEditor;
renderLayoutEditor = function () {
  origRenderLayout();
  document.querySelectorAll('.layout-item').forEach(function (el) {
    el.addEventListener('dragend', function () { this.style.borderColor = ''; });
  });
};

/** @returns {void} */
function renderServices() {
  const container = document.getElementById('servicesList');
  container.innerHTML = '';
  state.services.forEach((service, index) => {
    const div = document.createElement('div');
    div.className = `service-item ${service._deleted ? 'deleted' : ''}`;
    div.innerHTML = `
      <div class="service-fields">
        <input type="text" class="glass-input" placeholder="Nombre" value="${service.name}" oninput="updateService(${index}, 'name', this.value)">
        <div style="display:flex; gap:5px;">
          <input type="number" class="glass-input" placeholder="Duración (min)" value="${service.duration}" oninput="updateService(${index}, 'duration', this.value)">
          <input type="number" class="glass-input" placeholder="Precio ($)" value="${service.price}" oninput="updateService(${index}, 'price', this.value)">
        </div>
        <input type="url" class="glass-input" placeholder="URL Imagen" value="${service.image || ''}" oninput="updateService(${index}, 'image', this.value)">
        <div style="margin-top:5px; display:flex; align-items:center; gap:10px;">
          ${service.image ? `<img src="${fixImageUrl(service.image)}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;">` : ''}
          <input type="file" accept="image/*" class="glass-input" style="font-size:11px; padding:5px;" onchange="handleImageUpload(this, 'image', ${index})">
        </div>
      </div>
      <div class="service-actions">
        <button class="btn btn-danger" onclick="toggleDeleteService(${index})">${service._deleted ? '↩️' : '🗑️'}</button>
      </div>
    `;
    container.appendChild(div);
  });
}

/** @returns {void} */
function addService() {
  state.services.push({ name: '', duration: 30, price: 0, image: '', _deleted: false });
  renderServices();
  debounceSave();
}

/** @returns {void} */
function renderStaff() {
  const container = document.getElementById('staffListContainer');
  if(!container) return;
  container.innerHTML = '';
  state.staffList.forEach((s, i) => {
    let hoursObj = s.individual_hours;
    if (hoursObj && typeof hoursObj === 'string') {
      try { hoursObj = JSON.parse(hoursObj); } catch(e) { hoursObj = null; }
    }
    const hasCustomHours = hoursObj && typeof hoursObj === 'object';
    const workDays = hasCustomHours && Array.isArray(hoursObj.workDays) ? hoursObj.workDays : [];
    const startH = hasCustomHours && hoursObj.startHour !== undefined ? hoursObj.startHour : 9;
    const endH = hasCustomHours && hoursObj.endHour !== undefined ? hoursObj.endHour : 19;

    let daysHtml = '';
    ['D', 'L', 'M', 'M', 'J', 'V', 'S'].forEach((day, dIdx) => {
      const isChecked = workDays.map(Number).includes(dIdx);
      daysHtml += `
        <label style="display:flex; flex-direction:column; align-items:center; gap:4px; cursor:pointer;">
          <input type="checkbox" value="${dIdx}" ${isChecked ? 'checked' : ''} onchange="updateStaffHoursDays(${i}, ${dIdx}, this.checked)" style="width:16px; height:16px; cursor:pointer;">
          <span style="font-size:11px; font-weight:600; color:var(--text-muted);">${day}</span>
        </label>
      `;
    });

    container.innerHTML += `
      <div class="service-item" style="flex-direction: column; align-items: stretch; gap: 15px;">
        <div style="display: flex; gap: 15px; width: 100%;">
          <div class="service-fields" style="flex: 1;">
            <input type="text" class="glass-input" placeholder="Nombre" value="${escapeHtml(s.name)}" onchange="updateStaff(${i}, 'name', this.value)">
            <input type="email" class="glass-input" placeholder="Email (ej: juan@pelu.com)" value="${escapeHtml(s.email)}" ${s.id ? 'readonly disabled title="El email no se puede editar"' : ''} onchange="updateStaff(${i}, 'email', this.value)">
            <input type="text" class="glass-input" placeholder="Especialidades (Corte, Color... separadas por coma)" value="${(s.specialties||[]).join(', ')}" onchange="updateStaff(${i}, 'specialties', this.value.split(',').map(x=>x.trim()))">
            <input type="text" class="glass-input" placeholder="Breve Presentación / Bio (ej: Experto en degradados)" value="${escapeHtml(s.bio || '')}" onchange="updateStaff(${i}, 'bio', this.value)">
            <div style="margin-top:10px; display:flex; align-items:center; gap:10px;">
              ${s.photo_url ? `<img src="${fixImageUrl(s.photo_url)}" style="width:50px; height:50px; border-radius:50%; object-fit:cover; border:2px solid var(--primary);">` : `<div style="width:50px; height:50px; border-radius:50%; background:rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center; border:2px dashed rgba(255,255,255,0.2); font-size:20px;">👤</div>`}
              <div style="flex:1;">
                <label style="font-size: 11px; color:var(--text-muted); display:block; margin-bottom:4px;">Foto de Perfil</label>
                <input type="file" accept="image/*" class="glass-input" style="font-size:11px; padding:5px;" onchange="handleImageUpload(this, 'photo_url', null, ${i})">
              </div>
            </div>
            <label style="font-size: 0.8rem; margin-top:8px; display:flex; align-items:center; gap:5px; cursor:pointer;">
              <input type="checkbox" ${s.active ? 'checked' : ''} onchange="updateStaff(${i}, 'active', this.checked)"> Activo (se muestra en landing y recibe turnos)
            </label>
          </div>
          <div class="service-actions" style="align-self: flex-start;">
            <button class="btn btn-primary" onclick="saveStaff(${i})">💾 Guardar</button>
          </div>
        </div>
        <div style="border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px; margin-top: 5px;">
          <label style="font-size: 0.85rem; display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:600;">
            <input type="checkbox" ${hasCustomHours ? 'checked' : ''} onchange="toggleCustomHours(${i}, this.checked)">
            ⚙️ Configurar horarios personalizados
          </label>
          <div id="custom-hours-container-${i}" style="display: ${hasCustomHours ? 'block' : 'none'}; margin-top: 12px; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px;">
            <div class="form-group" style="margin-bottom:12px;">
              <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:6px;">Días Laborales del Peluquero</label>
              <div style="display:flex; gap:12px;">
                ${daysHtml}
              </div>
            </div>
            <div style="display:flex; gap:1rem;">
              <div class="form-group" style="flex:1; margin:0;">
                <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Hora Entrada</label>
                <input type="number" class="glass-input" min="0" max="23" value="${startH}" onchange="updateStaffHoursField(${i}, 'startHour', parseInt(this.value))">
              </div>
              <div class="form-group" style="flex:1; margin:0;">
                <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Hora Salida</label>
                <input type="number" class="glass-input" min="0" max="23" value="${endH}" onchange="updateStaffHoursField(${i}, 'endHour', parseInt(this.value))">
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });
}

/** @returns {void} */
function addStaffUI() {
  state.staffList.push({ name: '', email: '', specialties: [], active: true });
  renderStaff();
}

/** @param {number} index */
async function saveStaff(index) {
  const s = state.staffList[index];
  if(!s.name || !s.email) {
    showToast('❌ Nombre y Email requeridos', false);
    return;
  }
  showToast('Guardando peluquero...', true);
  try {
    const url = s.id ? '/api/tenant/staff/'+s.id : '/api/tenant/staff';
    const method = s.id ? 'PUT' : 'POST';
    const payload = {
      name: s.name,
      email: s.email,
      specialties: s.specialties,
      active: s.active,
      photo_url: s.photo_url || null,
      bio: s.bio || null,
      individual_hours: s.individual_hours
    };
    const res = await fetch(url, {
      method,
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error);
    if(!s.id) {
      s.id = data.staff.id;
      alert('Peluquero creado exitosamente. Clave temporal: ' + data.tempPassword + '\nPor favor dale esta clave al peluquero.');
    }
    showToast('✅ Peluquero guardado', false);
    renderStaff();
  } catch(e) {
    showToast('❌ ' + e.message, false);
  }
}

function renderGallery() {
  const container = document.getElementById('galleryPreview');
  container.innerHTML = state.gallery.map((url, i) => `
    <div class="gallery-item">
      <img src="${fixImageUrl(url)}" alt="Gallery">
      <button class="remove-btn" onclick="removeGallery(${i})">×</button>
    </div>
  `).join('');
}

function addGalleryFromUrl() {
  const url = document.getElementById('newGalleryUrl').value.trim();
  if (url) {
    state.gallery.push(url);
    document.getElementById('newGalleryUrl').value = '';
    renderGallery();
    debounceSave();
  }
}

window.handleImageUpload = async function (input, targetKey, serviceIndex = null, staffIndex = null) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast('❌ Imagen muy grande (max 5MB)', false);
    return;
  }
  showToast('Subiendo imagen...', true);
  try {
    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const base64 = e.target.result;
        const res = await fetch(`/api/upload-image`, {
          method: 'POST',
          headers: { 'Authorization': token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, filename: file.name })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error subiendo');
        if (!data.url) throw new Error('No se recibió URL');
        if (serviceIndex !== null) {
          state.services[serviceIndex].image = data.url;
          renderServices();
        } else if (staffIndex !== null) {
          state.staffList[staffIndex].photo_url = data.url;
          renderStaff();
        } else {
          state.tenant[targetKey] = data.url;
          const el = document.querySelector(`[data-key="${targetKey}"]`);
          if (el) el.value = data.url;
        }
        debounceSave();
        showToast('✅ Imagen subida', false);
      } catch (err) {
        console.error('UPLOAD ERROR:', err);
        showToast('❌ ' + err.message, false);
      }
    };
    reader.onerror = function () { showToast('❌ Error leyendo archivo', false); };
    reader.readAsDataURL(file);
  } catch (err) {
    console.error(err);
    showToast('❌ Error general', false);
  }
};

window.uploadAndAddGallery = async function () {
  const input = document.getElementById('newGalleryFile');
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const res = await fetch(`/api/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: e.target.result, filename: file.name })
      });
      if (!res.ok) throw new Error('Error al subir imagen');
      const data = await res.json();
      if (data.url) {
        state.gallery.push(data.url);
        renderGallery();
        debounceSave();
      } else {
        throw new Error('No se recibió URL');
      }
    } catch (err) {
      showToast('Error al subir', false);
    }
  };
  reader.readAsDataURL(file);
};

window.applyTheme = function(primary, secondary) {
  state.tenant.brand_primary_color = primary;
  state.tenant.brand_secondary_color = secondary;
  const pInput = document.querySelector('input[data-key="brand_primary_color"]');
  const sInput = document.querySelector('input[data-key="brand_secondary_color"]');
  if (pInput) pInput.value = primary;
  if (sInput) sInput.value = secondary;
  debounceSave();
  showToast('🎨 Tema aplicado, se guardará automáticamente', false);
};

window.applyPresetTheme = function(primary, secondary, stylePreset) {
  state.tenant.brand_primary_color = primary;
  state.tenant.brand_secondary_color = secondary;
  const primaryInput = document.querySelector('[data-key="brand_primary_color"]');
  const secondaryInput = document.querySelector('[data-key="brand_secondary_color"]');
  if (primaryInput) primaryInput.value = primary;
  if (secondaryInput) secondaryInput.value = secondary;
  let customCss = '';
  if (stylePreset === 'barber') {
    customCss = `/* 🧡 ESTILO BARBERIA CLASICA: Split Hero & Lista de Precios */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
:root {
  --font-heading: 'Playfair Display', serif;
}
h1, h2, h3, h4, h5, h6, .navbar-brand {
  font-family: var(--font-heading) !important;
  letter-spacing: 1px;
  font-weight: 800;
}
.glass-panel, .service-card, .team-card, .btn, .glass-input, .slot-btn {
  border-radius: 4px !important;
  box-shadow: none !important;
  border: 1px solid rgba(217, 119, 6, 0.2) !important;
}
.team-photo, .service-image {
  border-radius: 4px !important;
}
body {
  display: flex !important;
  flex-direction: column !important;
}
#hero { order: 1 !important; }
#servicios { order: 2 !important; }
#equipo { order: 3 !important; }
#galeria { order: 4 !important; }
#reservar { order: 5 !important; }
@media (min-width: 769px) {
  .hero {
    display: grid !important;
    grid-template-columns: 1.2fr 0.8fr !important;
    height: 70vh !important;
    min-height: 550px !important;
    padding: 0 !important;
    text-align: left !important;
  }
  .hero::before { display: none !important; }
  .hero-image {
    position: relative !important;
    width: 100% !important;
    height: 100% !important;
    opacity: 0.95 !important;
    grid-column: 2 !important;
    grid-row: 1 !important;
  }
  .hero-content {
    position: relative !important;
    max-width: 100% !important;
    padding: 60px 5% !important;
    grid-column: 1 !important;
    grid-row: 1 !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    align-items: flex-start !important;
  }
}
.services-grid {
  display: flex !important;
  flex-direction: column !important;
  gap: 16px !important;
}
.service-card {
  flex-direction: row !important;
  height: 130px !important;
  background: rgba(255,255,255,0.02) !important;
}
.service-image {
  width: 160px !important;
  height: 100% !important;
}
.service-content {
  padding: 16px 24px !important;
}
@media (max-width: 768px) {
  .service-card { flex-direction: column !important; height: auto !important; }
  .service-image { width: 100% !important; height: 180px !important; }
}`;
  } else if (stylePreset === 'zen') {
    customCss = `/* 💚 ESTILO SPA & WELLNESS: Ultra-Suave & Conversión Inmediata */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
:root {
  --font-heading: 'Plus Jakarta Sans', sans-serif;
}
* { font-family: 'Plus Jakarta Sans', sans-serif !important; }
.glass-panel, .service-card, .team-card {
  border-radius: 28px !important;
  border: 1px solid rgba(16, 185, 129, 0.15) !important;
}
.btn, .glass-input, .slot-btn { border-radius: 50px !important; }
.team-photo, .service-image { border-radius: 24px !important; }
body { display: flex !important; flex-direction: column !important; }
#hero { order: 1 !important; }
#reservar { order: 2 !important; }
#servicios { order: 3 !important; }
#equipo { order: 4 !important; }
#galeria { order: 5 !important; }
.booking-section { padding: 50px 20px !important; }
.booking-form {
  max-width: 750px !important;
  margin: 0 auto !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important;
  background: rgba(255, 255, 255, 0.04) !important;
}`;
  } else {
    customCss = '';
  }
  state.tenant.landing_custom_css = customCss;
  const cssTextarea = document.querySelector('[data-key="landing_custom_css"]');
  if (cssTextarea) cssTextarea.value = customCss;
  debounceSave();
  setTimeout(updatePreview, 500);
  showToast('🎨 Tema ' + stylePreset.toUpperCase() + ' aplicado', false);
};
