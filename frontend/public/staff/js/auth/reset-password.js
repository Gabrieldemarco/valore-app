// @ts-check

const API = window.location.origin;
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

/** @type {HTMLFormElement} */
const resetForm = /** @type {HTMLFormElement} */ (document.getElementById('resetForm'));
const newPassword = /** @type {HTMLInputElement} */ (document.getElementById('newPassword'));
const confirmPassword = /** @type {HTMLInputElement} */ (document.getElementById('confirmPassword'));
const submitBtn = /** @type {HTMLButtonElement} */ (document.getElementById('submitBtn'));
const errorMsg = /** @type {HTMLElement} */ (document.getElementById('errorMsg'));
const successMsg = /** @type {HTMLElement} */ (document.getElementById('successMsg'));
const successState = /** @type {HTMLElement} */ (document.getElementById('successState'));
const pageSubtitle = /** @type {HTMLElement} */ (document.getElementById('pageSubtitle'));

(async function init() {
  if (!token) {
    showError('Enlace inválido. Solicitá un nuevo restablecimiento.');
    return;
  }

  try {
    resetForm.style.display = 'block';
  } catch (err) {
    showError('Token inválido o expirado.');
  }
})();

resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const pass = newPassword.value.trim();
  const confirm = confirmPassword.value.trim();

  if (pass.length < 6) {
    showError('La contraseña debe tener al menos 6 caracteres.');
    return;
  }
  if (pass !== confirm) {
    showError('Las contraseñas no coinciden.');
    confirmPassword.focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span>Actualizando...';
  hideMessages();

  try {
    const response = await fetch(`${API}/api/staff/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: pass })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al actualizar la contraseña');
    }

    showSuccessState();

  } catch (err) {
    console.error('Reset error:', err);
    showError(/** @type {Error} */ (err).message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Actualizar contraseña';
  }
});

/** @param {string} message */
function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.add('show');
  successMsg.classList.remove('show');
}

/** @param {string} message */
function showSuccess(message) {
  successMsg.textContent = message;
  successMsg.classList.add('show');
  errorMsg.classList.remove('show');
}

function hideMessages() {
  errorMsg.classList.remove('show');
  successMsg.classList.remove('show');
}

function showSuccessState() {
  resetForm.style.display = 'none';
  pageSubtitle.style.display = 'none';
  successState.style.display = 'block';
}
