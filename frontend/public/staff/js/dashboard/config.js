// @ts-check

function toggleSettings() {
  const panel = document.getElementById('settingsPanel');
  if (!panel) return;
  const isVisible = panel.style.display === 'block';
  panel.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) loadTenantConfig();
}

async function loadTenantConfig() {
  try {
    const res = await fetch(`/api/tenant/me`, {
      headers: { 'Authorization': token }
    });

    if (!res.ok) { console.warn('Error cargando configuración:', res.status); return; }
    const { tenant } = await res.json();
    currentTenantData = tenant;

    const cfgName = /** @type {HTMLInputElement} */ (document.getElementById('cfgName'));
    const cfgAddress = /** @type {HTMLInputElement} */ (document.getElementById('cfgAddress'));
    const cfgEmail = /** @type {HTMLInputElement} */ (document.getElementById('cfgEmail'));
    const cfgWhatsapp = /** @type {HTMLInputElement} */ (document.getElementById('cfgWhatsapp'));
    const cfgSmtpEmail = /** @type {HTMLInputElement} */ (document.getElementById('cfgSmtpEmail'));
    const cfgSmtpPassword = /** @type {HTMLInputElement} */ (document.getElementById('cfgSmtpPassword'));

    if (cfgName) cfgName.value = tenant.business_name || '';
    if (cfgAddress) cfgAddress.value = tenant.business_address || '';
    if (cfgEmail) cfgEmail.value = tenant.notification_email || '';
    if (cfgWhatsapp) cfgWhatsapp.value = tenant.notification_whatsapp || tenant.business_phone || '';
    if (cfgSmtpEmail) cfgSmtpEmail.value = tenant.smtp_email || '';
    if (cfgSmtpPassword) cfgSmtpPassword.value = tenant.smtp_password || '';

    showToast('Configuración cargada', 'success');
  } catch (err) {
    console.error('❌ Error cargando config:', err);
    showToast('Error al cargar configuración', 'error');
  }
}

async function saveSettings() {
  const btn = /** @type {HTMLButtonElement} */ (document.getElementById('saveSettingsBtn'));
  if (!btn) return;
  const originalText = btn.textContent;
  btn.textContent = 'Guardando...';
  btn.disabled = true;

  const data = {
    business_name: /** @type {HTMLInputElement} */ (document.getElementById('cfgName'))?.value.trim() || '',
    business_address: /** @type {HTMLInputElement} */ (document.getElementById('cfgAddress'))?.value.trim() || '',
    notification_email: /** @type {HTMLInputElement} */ (document.getElementById('cfgEmail'))?.value.trim() || '',
    notification_whatsapp: /** @type {HTMLInputElement} */ (document.getElementById('cfgWhatsapp'))?.value.trim() || '',
    smtp_email: /** @type {HTMLInputElement} */ (document.getElementById('cfgSmtpEmail'))?.value.trim() || '',
    smtp_password: /** @type {HTMLInputElement} */ (document.getElementById('cfgSmtpPassword'))?.value.trim() || ''
  };

  try {
    const res = await fetch(`/api/tenant/settings`, {
      method: 'PUT',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      showToast('✅ Configuración guardada correctamente', 'success');
      setTimeout(() => toggleSettings(), 1000);
      if (data.business_name) {
        document.title = `📊 ${data.business_name}`;
      }
    } else {
      const err = await res.json();
      showToast('❌ Error: ' + (err.error || 'No se pudo guardar'), 'error');
    }
  } catch (err) {
    showToast('❌ Error de conexión', 'error');
    console.error(err);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}
