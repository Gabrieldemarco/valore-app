// @ts-check

const API = '';

document.getElementById('forgotForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = /** @type {HTMLInputElement} */ (document.getElementById('email')).value;
  const submitBtn = /** @type {HTMLButtonElement} */ (document.getElementById('submitBtn'));
  const errorMsg = document.getElementById('errorMsg');
  const successMsg = document.getElementById('successMsg');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';
  errorMsg?.classList.remove('show');
  successMsg?.classList.remove('show');

  try {
    const res = await fetch(`${API}/api/staff/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Error al enviar el enlace');

    if (successMsg) {
      successMsg.textContent = data.message || '✅ Revisá tu correo. Te enviamos instrucciones.';
      successMsg.classList.add('show');
    }
    /** @type {HTMLFormElement} */ (document.getElementById('forgotForm')).reset();

  } catch (err) {
    if (errorMsg) {
      errorMsg.textContent = /** @type {Error} */ (err).message;
      errorMsg.classList.add('show');
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar enlace';
  }
});
