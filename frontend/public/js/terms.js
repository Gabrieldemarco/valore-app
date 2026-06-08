function switchTab(tabId, btnElement) {
  document.querySelectorAll('.legal-content-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  document.querySelectorAll('.legal-nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const targetPane = document.getElementById(tabId);
  if (targetPane) {
    targetPane.classList.add('active');
  }

  btnElement.classList.add('active');

  window.location.hash = tabId;

  if (window.innerWidth <= 868) {
    const main = document.querySelector('.legal-main');
    if (main) main.scrollIntoView({ behavior: 'smooth' });
  }
}

function initFromHash() {
  const hash = window.location.hash.slice(1);
  if (['terms', 'privacy', 'cancellations'].includes(hash)) {
    const btn = document.querySelector(`.legal-nav-btn[onclick*="'${hash}'"]`) ||
                document.querySelectorAll('.legal-nav-btn')[['terms', 'privacy', 'cancellations'].indexOf(hash)];
    if (btn) {
      btn.click();
    }
  }
}

document.addEventListener('DOMContentLoaded', initFromHash);
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1);
  if (['terms', 'privacy', 'cancellations'].includes(hash)) {
    const btn = document.querySelector(`.legal-nav-btn[onclick*="'${hash}'"]`) ||
                document.querySelectorAll('.legal-nav-btn')[['terms', 'privacy', 'cancellations'].indexOf(hash)];
    if (btn) {
      btn.click();
    }
  }
});
