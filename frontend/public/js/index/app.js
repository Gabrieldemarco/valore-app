// @ts-check

const API_BASE = '';

/**
 * @typedef {Object} Salon
 * @property {number} id
 * @property {string} business_name
 * @property {string} [slug]
 * @property {string} [business_address]
 * @property {string} [landing_description]
 * @property {string} [brand_logo_url]
 * @property {string} [landing_hero_image]
 * @property {Array<{name?: string}|string>} [services]
 */

/** @type {Salon[]} */
let allSalons = [];
let currentGenderFilter = 'all';

/**
 * @param {string} url
 * @returns {string}
 */
function fixImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return API_BASE + url;
  return url;
}

/**
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  if (!name) return 'AP';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

document.addEventListener('DOMContentLoaded', loadSalons);

async function loadSalons() {
  try {
    const healthRes = await fetch(`${API_BASE}/api/health`);
    if (!healthRes.ok) throw new Error('Backend no disponible');

    const res = await fetch(`${API_BASE}/api/tenants`);
    if (!res.ok) throw new Error('Error cargando peluquerías');

    const data = await res.json();
    allSalons = data.tenants || [];

    renderSalons(allSalons);
  } catch (err) {
    console.error('Error:', err);
    const container = document.getElementById('salonsContainer');
    if (container) {
      container.innerHTML =
        `<div class="empty-state glass-panel">
          <h3 class="text-gradient">⚠️ Sin conexión</h3>
          <p>No pudimos cargar las peluquerías. Verificá que el backend esté corriendo.</p>
          <a href="staff/register.html" class="btn btn-accent">Registrar mi peluquería</a>
        </div>`;
    }
  }
}

/**
 * @param {Salon} salon
 * @returns {'hombre'|'mujer'|'unisex'}
 */
function getGenderCategory(salon) {
  const name = (salon.business_name || '').toLowerCase();
  const desc = (salon.landing_description || '').toLowerCase();
  const services = (salon.services || []).map(s => typeof s === 'object' ? s?.name || '' : s).join(' ').toLowerCase();

  const allText = `${name} ${desc} ${services}`;

  const menKeywords = ['barber', 'barbería', 'barbero', 'afeitado', 'barba', 'caballero', 'hombre', 'men', 'beard', 'masculino', 'corte de hombre', 'corte masculino'];
  const womenKeywords = ['alisado', 'dama', 'mujer', 'peinado', 'color', 'tintura', 'uñas', 'nails', 'maquillaje', 'makeup', 'balayage', 'mechas', 'femenino', 'corte de dama', 'corte femenino'];

  const hasMen = menKeywords.some(kw => allText.includes(kw));
  const hasWomen = womenKeywords.some(kw => allText.includes(kw));

  if (hasMen && hasWomen) return 'unisex';
  if (hasMen) return 'hombre';
  if (hasWomen) return 'mujer';
  return 'unisex';
}

/** @param {'all'|'hombre'|'mujer'|'unisex'} filter */
function setGenderFilter(filter) {
  currentGenderFilter = filter;

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const targetBtn = Array.from(document.querySelectorAll('.filter-btn')).find(btn =>
    btn.getAttribute('onclick')?.includes(`'${filter}'`)
  );
  if (targetBtn) targetBtn.classList.add('active');

  filterSalons();
}

/** @param {'all'|'hombre'|'mujer'|'unisex'} filter */
function selectGenderFromHero(filter) {
  setGenderFilter(filter);
  const targetSection = document.getElementById('salons');
  if (targetSection) {
    targetSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function filterSalons() {
  const searchInput = /** @type {HTMLInputElement} */ (document.getElementById('searchInput'));
  const query = searchInput.value.toLowerCase().trim();

  let filtered = allSalons;

  if (query) {
    filtered = filtered.filter(salon =>
      salon.business_name?.toLowerCase().includes(query) ||
      salon.business_address?.toLowerCase().includes(query) ||
      salon.slug?.toLowerCase().includes(query)
    );
  }

  if (currentGenderFilter !== 'all') {
    filtered = filtered.filter(salon => {
      const category = getGenderCategory(salon);
      return category === currentGenderFilter;
    });
  }

  renderSalons(filtered);
}

/** @param {number} idx */
function scrollToSalon(idx) {
  const grid = document.querySelector('.salons-grid');
  if (!grid) return;
  const cards = grid.querySelectorAll('.salon-link');
  if (cards[idx]) {
    cards[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }
}

/** @param {number} salonsCount */
function setupSliderDots(salonsCount) {
  const dotsContainer = document.getElementById('sliderDots');
  if (!dotsContainer) return;

  if (salonsCount <= 1) {
    dotsContainer.innerHTML = '';
    return;
  }

  dotsContainer.innerHTML = Array.from({ length: salonsCount }).map((_, idx) => `
    <span class="slider-dot ${idx === 0 ? 'active' : ''}" onclick="scrollToSalon(${idx})"></span>
  `).join('');

  const grid = document.querySelector('.salons-grid');
  if (grid) {
    grid.addEventListener('scroll', () => {
      const scrollLeft = grid.scrollLeft;
      const cardWidth = grid.querySelector('.salon-link')?.offsetWidth || 350;
      const activeIndex = Math.round(scrollLeft / cardWidth);

      document.querySelectorAll('.slider-dot').forEach((dot, i) => {
        if (i === activeIndex) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    });
  }
}

/** @param {Salon[]} salons */
function renderSalons(salons) {
  const container = /** @type {HTMLElement} */ (document.getElementById('salonsContainer'));

  if (!salons || salons.length === 0) {
    container.innerHTML =
      `<div class="empty-state glass-panel" style="width: 100%;">
        <h3 class="text-gradient">🔍 No se encontraron peluquerías</h3>
        <p>Probá ajustando tus filtros de búsqueda.</p>
      </div>`;
    const dotsContainer = document.getElementById('sliderDots');
    if (dotsContainer) dotsContainer.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="salons-grid">
      ${salons.map(salon => {
        const services = salon.services || ['Corte', 'Color', 'Alisado'];
        const imageUrl = salon.brand_logo_url || salon.landing_hero_image;
        const gender = getGenderCategory(salon);

        let genderBadgeHtml = '';
        if (gender === 'hombre') {
          genderBadgeHtml = `<span class="salon-badge">Caballeros</span>`;
        } else if (gender === 'mujer') {
          genderBadgeHtml = `<span class="salon-badge">Damas</span>`;
        } else {
          genderBadgeHtml = `<span class="salon-badge">Unisex</span>`;
        }

        return `
          <a href="landing?tenant=${salon.slug}" class="salon-link">
            <div class="salon-card glass-panel">
              <div class="salon-image-wrapper">
                ${imageUrl
                  ? `<img src="${fixImageUrl(imageUrl)}" alt="${salon.business_name}">`
                  : `<div class="salon-image-fallback"><span class="salon-initials">${getInitials(salon.business_name)}</span></div>`
                }
                ${genderBadgeHtml}
              </div>
              <div class="salon-content">
                <h3 class="salon-name text-gradient">${salon.business_name}</h3>
                <div class="salon-location">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; stroke: var(--primary); flex-shrink: 0; display: inline-block; vertical-align: middle; margin-right: 6px;">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  ${salon.business_address || 'Ubicación no especificada'}
                </div>
                <div class="salon-services">
                  ${services.slice(0, 3).map(s => `<span class="service-tag">${typeof s === 'object' ? s.name : s}</span>`).join('')}
                </div>
                <div class="salon-footer">
                  <div class="salon-rating">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width: 13px; height: 13px; fill: var(--primary); flex-shrink: 0; display: inline-block; vertical-align: middle; margin-right: 5px;">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    5.0 <small>(Excelente)</small>
                  </div>
                  <span class="btn btn-primary">Reservar →</span>
                </div>
              </div>
            </div>
          </a>
        `;
      }).join('')}
    </div>
  `;

  setupSliderDots(salons.length);
}
