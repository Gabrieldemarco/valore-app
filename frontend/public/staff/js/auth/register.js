// @ts-check

const API_URL = '';
const form = /** @type {HTMLFormElement} */ (document.getElementById('registerForm'));
const errorMsg = /** @type {HTMLElement} */ (document.getElementById('errorMsg'));
const successMsg = /** @type {HTMLElement} */ (document.getElementById('successMsg'));
const submitBtn = /** @type {HTMLButtonElement} */ (document.getElementById('submitBtn'));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.style.display = 'none';
  successMsg.style.display = 'none';

  const acceptTerms = /** @type {HTMLInputElement} */ (document.getElementById('acceptTerms'));
  if (!acceptTerms.checked) {
    errorMsg.textContent = '❌ Debes aceptar los Términos y Condiciones para registrarte.';
    errorMsg.style.display = 'block';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Registrando...';

  const payload = {
    businessName: /** @type {HTMLInputElement} */ (document.getElementById('businessName')).value.trim(),
    email: /** @type {HTMLInputElement} */ (document.getElementById('email')).value.trim(),
    password: /** @type {HTMLInputElement} */ (document.getElementById('password')).value,
    phone: /** @type {HTMLInputElement} */ (document.getElementById('phone')).value.trim(),
    address: /** @type {HTMLInputElement} */ (document.getElementById('address')).value.trim()
  };

  try {
    const res = await fetch(`${API_URL}/api/staff/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Error al registrar');

    successMsg.textContent = '✅ ¡Registro exitoso! Redirigiendo al login...';
    successMsg.style.display = 'block';

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);

  } catch (err) {
    errorMsg.textContent = '❌ ' + /** @type {Error} */ (err).message;
    errorMsg.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Crear Cuenta';
  }
});
