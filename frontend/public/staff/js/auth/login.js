// @ts-check

const API = '';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = /** @type {HTMLInputElement} */ (document.getElementById('email')).value;
  const password = /** @type {HTMLInputElement} */ (document.getElementById('password')).value;
  const submitBtn = /** @type {HTMLButtonElement} */ (document.getElementById('submitBtn'));
  const errorMsg = document.getElementById('errorMsg');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Ingresando...';
  errorMsg?.classList.remove('show');

  try {
    const res = await fetch(`${API}/api/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Error en el login');

    localStorage.setItem('staffToken', data.token);
    localStorage.setItem('staffName', data.name);
    localStorage.setItem('staffRole', data.role);

    window.location.href = 'dashboard.html';

  } catch (err) {
    if (errorMsg) {
      errorMsg.textContent = /** @type {Error} */ (err).message;
      errorMsg.classList.add('show');
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Ingresar';
  }
});
