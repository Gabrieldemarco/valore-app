// @ts-check

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = /** @type {HTMLInputElement} */ (document.getElementById('email')).value;
  const password = /** @type {HTMLInputElement} */ (document.getElementById('password')).value;

  try {
    const res = await fetch('/api/super-admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    localStorage.setItem('superAdminToken', data.token);
    localStorage.setItem('superAdminName', data.name);
    window.location.href = 'dashboard.html';
  } catch (err) {
    const errorMsg = document.getElementById('errorMsg');
    if (errorMsg) {
      errorMsg.textContent = /** @type {Error} */ (err).message;
      errorMsg.style.display = 'block';
    }
  }
});
