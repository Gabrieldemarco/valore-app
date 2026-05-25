const fs = require('fs');
let html = fs.readFileSync('../frontend/public/staff/landing-editor.html', 'utf8');

// 1. Reemplazar tab-team
const oldTabTeamRegex = /<div id="tab-team" class="tab-content" style="display:none">[\s\S]*?<\/div>[\s\S]*?<\/div>/;

const newTabTeam = `
        <div id="tab-team" class="tab-content" style="display:none">
          <div class="card glass-panel">
            <h3 class="text-gradient">Equipo (Peluqueros)</h3>
            <p style="margin-bottom:1rem; color:var(--text-muted); font-size:0.9rem;">Agrega o edita los peluqueros. Cada uno tendra su propia agenda y disponibilidad.</p>
            <div id="staffListContainer"></div>
            <button class="btn btn-primary" onclick="addStaffUI()">+ Nuevo Peluquero</button>
          </div>
        </div>`;

html = html.replace(oldTabTeamRegex, newTabTeam);

// 2. State
html = html.replace('team: [],', 'team: [],\n      staffList: [],');

// 3. LoadAllData
html = html.replace('populateForms();', `
        const staffRes = await fetch('/api/tenant/staff', { headers: { 'Authorization': token } });
        if(staffRes.ok) {
          const staffData = await staffRes.json();
          state.staffList = staffData.staff || [];
        }
        populateForms();
        if(typeof renderStaff === 'function') renderStaff();
`);

// 4. JS Functions
const jsFuncs = `
    // === STAFF FUNCTIONS ===
    function renderStaff() {
      const container = document.getElementById('staffListContainer');
      if(!container) return;
      container.innerHTML = '';
      state.staffList.forEach((s, i) => {
        container.innerHTML += \`
          <div class="service-item">
            <div class="service-fields">
              <input type="text" class="glass-input" placeholder="Nombre" value="\${s.name}" onchange="updateStaff(\${i}, 'name', this.value)">
              <input type="email" class="glass-input" placeholder="Email (ej: juan@pelu.com)" value="\${s.email}" \${s.id ? 'readonly disabled title="El email no se puede editar"' : ''} onchange="updateStaff(\${i}, 'email', this.value)">
              <input type="text" class="glass-input" placeholder="Especialidades (Corte, Color... separadas por coma)" value="\${(s.specialties||[]).join(', ')}" onchange="updateStaff(\${i}, 'specialties', this.value.split(',').map(x=>x.trim()))">
              <label style="font-size: 0.8rem; margin-top:5px;"><input type="checkbox" \${s.active ? 'checked' : ''} onchange="updateStaff(\${i}, 'active', this.checked)"> Activo (se muestra en landing y recibe turnos)</label>
            </div>
            <div class="service-actions">
              <button class="btn btn-primary" onclick="saveStaff(\${i})">💾 Guardar</button>
            </div>
          </div>
        \`;
      });
    }
    
    function addStaffUI() {
      state.staffList.push({ name: '', email: '', specialties: [], active: true });
      renderStaff();
    }
    
    function updateStaff(index, field, value) {
      state.staffList[index][field] = value;
    }
    
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
          active: s.active
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
          alert('Peluquero creado exitosamente. Clave temporal para iniciar sesión: ' + data.tempPassword + '\\nPor favor dale esta clave al peluquero.');
        }
        showToast('✅ Peluquero guardado', false);
        renderStaff();
      } catch(e) {
        showToast('❌ ' + e.message, false);
      }
    }
    // =======================

    function renderGallery() {`;

html = html.replace('function renderGallery() {', jsFuncs);

fs.writeFileSync('../frontend/public/staff/landing-editor.html', html);
console.log('Patched editor');
