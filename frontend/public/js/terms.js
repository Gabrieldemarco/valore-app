// @ts-check

/**
 * @param {string} tabId
 * @param {HTMLElement} btnElement
 */
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

  if (window.innerWidth <= 868) {
    const main = document.querySelector('.legal-main');
    if (main) main.scrollIntoView({ behavior: 'smooth' });
  }
}
