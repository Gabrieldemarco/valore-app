// @ts-check
(function () {
  'use strict';

  /** @type {URLSearchParams} */
  var urlParams = new URLSearchParams(window.location.search);
  /** @type {string|null} */
  var slug = urlParams.get('tenant');
  var API_BASE = window.location.origin;

  /**
   * @param {string|null|undefined} url
   * @returns {string}
   */
  function fixImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads')) return API_BASE + url;
    return url;
  }

  var FETCH_TIMEOUT = 10000;
  var LOCALE = 'es-UY';

  var PLACEHOLDERS = {
    service: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMjIwIiB2aWV3Qm94PSIwIDAgNDAwIDIyMCI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyMjAiIGZpbGw9IiNmMWY1ZjkiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk0YTNiOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtd2VpZ2h0PSI1MDAiPlNlcnZpY2lvPC90ZXh0Pjwvc3ZnPg==',
    team: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiB2aWV3Qm94PSIwIDAgMTUwIDE1MCI+PGNpcmNsZSBjeD0iNzUiIGN5PSI3NSIgcj0iNzUiIGZpbGw9IiNmMWY1ZjkiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk0YTNiOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iNDAiPvCfkqA8L3RleHQ+PC9zdmc+',
    gallery: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNDAwIDQwMCI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNmMWY1ZjkiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk0YTNiOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iNDAiPvCfpJY8L3RleHQ+PC9zdmc+'
  };

  /**
   * @param {string|null|undefined} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * @param {string} phone
   * @returns {boolean}
   */
  function isValidPhone(phone) {
    return /^\d{7,15}$/.test(phone.replace(/[\s\-\(\)\+]/g, ''));
  }

  /**
   * @param {Function} fn
   * @param {number} delay
   * @returns {Function}
   */
  function debounce(fn, delay) {
    var timer;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
    };
  }

  /** @returns {string} */
  function getTodayLocal() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /**
   * @param {string} url
   * @param {RequestInit} [options]
   * @param {number} [timeout]
   * @returns {Promise<Response>}
   */
  async function fetchWithTimeout(url, options, timeout) {
    options = options || {};
    timeout = timeout || FETCH_TIMEOUT;
    var controller = new AbortController();
    var id = setTimeout(function () { controller.abort(); }, timeout);
    try {
      var res = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
      clearTimeout(id);
      return res;
    } catch (err) {
      clearTimeout(id);
      if (err.name === 'AbortError') throw new Error('La petición tardó demasiado. Intentá de nuevo.');
      throw err;
    }
  }

  /**
   * @param {number|string} num
   * @returns {string}
   */
  function formatPrice(num) {
    return '$ ' + parseFloat(num || 0).toLocaleString(LOCALE);
  }

  /**
   * @param {string} isoString
   * @returns {string}
   */
  function formatTime(isoString) {
    return new Date(isoString).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  }

  // ─── DOM REFS ────────────────────────────────────
  var el = {
    hero: document.getElementById('hero'),
    heroImage: document.getElementById('heroImage'),
    heroLogo: document.getElementById('heroLogo'),
    heroTrust: document.getElementById('heroTrust'),
    businessName: document.getElementById('businessName'),
    landingDescription: document.getElementById('landingDescription'),
    servicios: document.getElementById('servicios'),
    servicesGrid: document.getElementById('servicesGrid'),
    galeria: document.getElementById('galeria'),
    galleryGrid: document.getElementById('galleryGrid'),
    equipo: document.getElementById('equipo'),
    teamGrid: document.getElementById('teamGrid'),
    socialLinks: document.getElementById('socialLinks'),
    reservar: document.getElementById('reservar'),
    footerSocial: document.getElementById('footerSocial'),
    footerBusiness: document.getElementById('footerBusiness'),
    footerAddress: document.getElementById('footerAddress'),
    footerPhone: document.getElementById('footerPhone'),
    footerCopyright: document.getElementById('footerCopyright'),
    footerYear: document.getElementById('footerYear'),
    serviceSelect: document.getElementById('service'),
    staffSelect: document.getElementById('staff'),
    staffGroup: document.getElementById('staffGroup'),
    dateInput: document.getElementById('date'),
    slotsContainer: document.getElementById('slotsContainer'),
    slotsList: document.getElementById('slotsList'),
    selectedSlot: document.getElementById('selectedSlot'),
    slotError: document.getElementById('slotError'),
    phoneError: document.getElementById('phoneError'),
    bookingForm: document.getElementById('bookingForm'),
    bookingStepper: document.getElementById('bookingStepper'),
    step1: document.getElementById('step1'),
    step2: document.getElementById('step2'),
    step3: document.getElementById('step3'),
    step4: document.getElementById('step4'),
    prevStepBtn: document.getElementById('prevStepBtn'),
    nextStepBtn: document.getElementById('nextStepBtn'),
    submitBtn: document.getElementById('submitBtn'),
    result: document.getElementById('result'),
    customCss: document.getElementById('custom-css'),
    lbClose: document.getElementById('lbClose'),
    lbPrev: document.getElementById('lbPrev'),
    lbNext: document.getElementById('lbNext'),
    lightbox: document.getElementById('lightbox'),
    lightboxImg: document.getElementById('lightboxImg'),
    lightboxCounter: document.getElementById('lightboxCounter')
  };

  var pageContent = document.getElementById('page-content');
  var MAIN_SECTIONS = [el.hero, el.servicios, el.galeria, el.equipo, el.reservar];

  var tenantData = {};
  var servicesData = [];
  var galleryImages = [];
  var currentImageIndex = 0;
  var slotsAbortController = null;
  var currentBookingStep = 1;

  // ─── ERROR PAGE ──────────────────────────────────
  /**
   * @param {string} title
   * @param {string} message
   * @param {boolean} showRetry
   */
  function showErrorPage(title, message, showRetry) {
    MAIN_SECTIONS.forEach(function (s) { if (s) s.style.display = 'none'; });

    var existing = document.getElementById('errorPage');
    if (existing) existing.remove();

    var div = document.createElement('div');
    div.id = 'errorPage';
    div.className = 'error-page';
    div.innerHTML =
      '<h1 class="text-gradient">' + escapeHtml(title) + '</h1>' +
      '<p>' + escapeHtml(message) + '</p>' +
      (showRetry ? '<button class="btn btn-primary" id="retryBtn">Intentar de nuevo</button>' : '');

    pageContent.appendChild(div);

    if (showRetry) {
      document.getElementById('retryBtn').addEventListener('click', function () {
        div.remove();
        MAIN_SECTIONS.forEach(function (s) { if (s) s.style.display = ''; });
        init();
      });
    }
  }

  // ─── INIT ────────────────────────────────────────
  async function init() {
    if (!slug) {
      showErrorPage('⚠️ URL incompleta', 'Esta página necesita un parámetro ?tenant=xxx para funcionar.', false);
      return;
    }

    try {
      var res = await fetchWithTimeout(
        API_BASE + '/p/' + encodeURIComponent(slug) + '/landing'
      );

      if (res.status === 404) {
        showErrorPage('🔍 No encontrado', 'El negocio "' + escapeHtml(slug) + '" no existe o fue dado de baja.', false);
        return;
      }

      if (res.status >= 500) {
        showErrorPage('🔴 Error del servidor', 'Hubo un problema interno. Intentá de nuevo en unos minutos.', true);
        return;
      }

      if (!res.ok) throw new Error('HTTP ' + res.status);

      var data = await res.json();
      tenantData = data.tenant || {};
      servicesData = data.services || [];

      try {
        var staffRes = await fetchWithTimeout(API_BASE + '/p/' + encodeURIComponent(slug) + '/staff');
        if(staffRes.ok) {
          var staffData = await staffRes.json();
          window.staffData = staffData.staff || [];
        }
      } catch(e) { window.staffData = []; }


      applyBranding();
      renderHero();
      renderServices();
      renderGallery();
      renderTeam();
      renderSocialLinks();
      renderFooter();
      initBookingForm();
      initLightbox();
      applyLayout();

    } catch (err) {
      showErrorPage('📡 Sin conexión', err.message + ' Verificá tu conexión a internet e intentá de nuevo.', true);
    }
  }

  /**
   * @param {string} hex
   * @param {number} percent
   * @returns {string}
   */
  function darkenColor(hex, percent) {
    if (!hex || hex[0] !== '#') return '#0f172a';
    var cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2];
    }
    var num = parseInt(cleanHex, 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) - amt,
        G = (num >> 8 & 0x00FF) - amt,
        B = (num & 0x0000FF) - amt;
    
    R = R < 0 ? 0 : R > 255 ? 255 : R;
    G = G < 0 ? 0 : G > 255 ? 255 : G;
    B = B < 0 ? 0 : B > 255 ? 255 : B;

    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  // ─── BRANDING ────────────────────────────────────
  function applyBranding() {
    var root = document.documentElement;
    var primary = tenantData.brand_primary_color || '#cfa86b';
    var secondary = tenantData.brand_secondary_color || '#dfc293';

    root.style.setProperty('--primary', primary);
    root.style.setProperty('--secondary', secondary);
    root.style.setProperty('--gradient', 'linear-gradient(135deg, ' + primary + ' 0%, ' + secondary + ' 100%)');

    var bgDeep = darkenColor(primary, 85);
    var bgGradStart = darkenColor(primary, 75);
    var bgGradEnd = darkenColor(secondary, 80);

    root.style.setProperty('--bg-deep', bgDeep);
    root.style.setProperty('--bg-gradient-start', bgGradStart);
    root.style.setProperty('--bg-gradient-end', bgGradEnd);

    el.customCss.textContent = tenantData.landing_custom_css || '';
    document.title = (tenantData.business_name || 'Reservar Turno') + ' | Velsoie';
  }

  // ─── HERO ────────────────────────────────────────
  function renderHero() {
    el.businessName.textContent = tenantData.business_name || 'Reservá tu turno online';
    el.landingDescription.textContent = tenantData.landing_description || 'Elegí servicio, horario y listo. Sin llamadas, sin vueltas.';

    if (tenantData.landing_hero_image) {
      el.heroImage.style.backgroundImage = 'url(' + fixImageUrl(tenantData.landing_hero_image) + ')';
    }

    if (tenantData.brand_logo_url) {
      el.heroLogo.src = fixImageUrl(tenantData.brand_logo_url);
      el.heroLogo.style.display = 'inline-block';
    }

    if (tenantData.business_name) {
      el.heroTrust.style.display = 'flex';
    }
  }

  // ─── SERVICES ────────────────────────────────────
  function renderServices() {
    if (!servicesData.length) {
      el.servicesGrid.innerHTML = '<p style="text-align:center;color:#64748b;grid-column:1/-1;padding:40px">Sin servicios disponibles</p>';
      el.serviceSelect.innerHTML = '<option value="">Sin servicios</option>';
      return;
    }

    el.servicesGrid.innerHTML = servicesData.map(function (s) {
      var imgUrl = fixImageUrl(s.landing_image || s.image) || PLACEHOLDERS.service;
      return '<div class="service-card glass-panel glass-panel-hover">' +
        '<img src="' + escapeHtml(imgUrl) + '" alt="' + escapeHtml(s.name) + '" class="service-image" onerror="this.src=\'' + PLACEHOLDERS.service + '\'">' +
        '<div class="service-content">' +
        '<div class="service-name">' + escapeHtml(s.name) + '</div>' +
        '<div class="service-desc">' + escapeHtml(s.landing_description || '') + '</div>' +
        '<div class="service-meta">' +
        '<span class="service-duration">⏱️ ' + (s.duration || 0) + ' min</span>' +
        '<span class="service-price">' + formatPrice(s.price) + '</span>' +
        '</div>' +
        '</div>' +
        '</div>';
    }).join('');

    el.serviceSelect.innerHTML = '<option value="">Seleccionar servicio...</option>' +
      servicesData.map(function (s) {
        return '<option value="' + escapeHtml(s.id) + '">' +
          escapeHtml(s.name) + ' • ' + (s.duration || 0) + ' min • ' + formatPrice(s.price) +
          '</option>';
      }).join('');
  }

  // ─── GALLERY ─────────────────────────────────────
  function renderGallery() {
    galleryImages = tenantData.landing_gallery || [];
    if (!galleryImages.length) { el.galeria.style.display = 'none'; return; }

    el.galleryGrid.innerHTML = galleryImages.map(function (url, i) {
      var fixedUrl = fixImageUrl(url);
      return '<div class="gallery-item" data-index="' + i + '">' +
        '<img src="' + escapeHtml(fixedUrl) + '" alt="Galería ' + (i + 1) + '" loading="lazy" onerror="this.src=\'' + PLACEHOLDERS.gallery + '\'">' +
        '</div>';
    }).join('');
  }

  // ─── TEAM ────────────────────────────────────────
  function renderTeam() {
    var team = window.staffData && window.staffData.length > 0 ? window.staffData : (tenantData.landing_team || []);
    if (!team.length) { el.equipo.style.display = 'none'; return; }

    el.teamGrid.innerHTML = team.map(function (m) {
      var photoUrl = fixImageUrl(m.photo_url || m.photo) || PLACEHOLDERS.team;
      var cardId = m.id || '';
      return '<div class="team-card glass-panel glass-panel-hover" data-staff-id="' + cardId + '" onclick="selectStaffFromCard(this, \'' + cardId + '\')" style="cursor:pointer;">' +
        '<img src="' + escapeHtml(photoUrl) + '" alt="' + escapeHtml(m.name) + '" class="team-photo" loading="lazy" onerror="this.src=\'' + PLACEHOLDERS.team + '\'">' +
        '<div class="team-name">' + escapeHtml(m.name) + '</div>' +
        '<div class="team-role">' + escapeHtml((m.specialties||[]).join(', ') || m.role || 'Estilista') + '</div>' +
        '<div class="team-bio">' + escapeHtml(m.bio || '') + '</div>' +
        '</div>';
    }).join('');

    if (window.staffData && window.staffData.length > 0 && el.staffSelect) {
       el.staffGroup.style.display = 'block';
       el.staffSelect.innerHTML = '<option value="">Cualquier peluquero</option>';
       window.staffData.forEach(function(s) {
         el.staffSelect.innerHTML += '<option value="' + s.id + '">' + escapeHtml(s.name) + '</option>';
       });
    }
  }

  // ─── SOCIAL LINKS ───────────────────────────────
  function renderSocialLinks() {
    var links = tenantData.landing_social_links || {};
    var icons = { instagram: '📷', facebook: '📘', whatsapp: '💬', twitter: '🐦', tiktok: '🎵' };

    var html = Object.keys(links)
      .filter(function (k) { return links[k]; })
      .map(function (k) {
        return '<a href="' + escapeHtml(links[k]) + '" target="_blank" rel="noopener noreferrer" class="social-link" title="' + escapeHtml(k) + '">' + (icons[k] || '🔗') + '</a>';
      }).join('');

    if (html) {
      el.socialLinks.innerHTML = html;
      el.socialLinks.style.display = 'flex';
      el.footerSocial.innerHTML = html;
      el.footerSocial.style.display = 'flex';
    } else {
      el.socialLinks.style.display = 'none';
      el.footerSocial.style.display = 'none';
    }
  }

  // ─── FOOTER ─────────────────────────────────────
  function renderFooter() {
    el.footerBusiness.textContent = tenantData.business_name || '';
    el.footerAddress.textContent = tenantData.business_address || '';
    el.footerPhone.textContent = tenantData.business_phone ? '📞 ' + tenantData.business_phone : '';
    el.footerCopyright.textContent = tenantData.business_name || '';
    el.footerYear.textContent = new Date().getFullYear();
  }

  // ─── BOOKING FORM ───────────────────────────────
  function initBookingForm() {
    var today = getTodayLocal();
    el.dateInput.min = today;
    el.dateInput.value = today;

    initCustomCalendar();

    var debouncedLoad = debounce(loadAvailableSlots, 300);
    el.serviceSelect.addEventListener('change', debouncedLoad);
    if(el.staffSelect) el.staffSelect.addEventListener('change', debouncedLoad);
    el.dateInput.addEventListener('change', debouncedLoad);

    el.prevStepBtn.addEventListener('click', goToPrevBookingStep);
    el.nextStepBtn.addEventListener('click', goToNextBookingStep);
    el.bookingForm.addEventListener('submit', handleBooking);

    el.slotsList.addEventListener('click', function (e) {
      var btn = e.target.closest('.slot-btn');
      if (!btn) return;
      el.slotsList.querySelectorAll('.slot-btn').forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      el.selectedSlot.value = btn.dataset.slot;
      el.slotError.classList.remove('visible');
    });

    setBookingStep(1);
  }

  // ========== CALENDARIO PERSONALIZADO ==========
  /** @type {{ year: number, month: number, selectedDate: string }} */
  var calState = { year: 0, month: 0, selectedDate: '' };

  function initCustomCalendar() {
    var now = new Date();
    calState.year = now.getFullYear();
    calState.month = now.getMonth();
    calState.selectedDate = getTodayLocal();

    document.getElementById('calPrev').addEventListener('click', function () {
      calState.month--;
      if (calState.month < 0) { calState.month = 11; calState.year--; }
      renderCalendar();
    });

    document.getElementById('calNext').addEventListener('click', function () {
      calState.month++;
      if (calState.month > 11) { calState.month = 0; calState.year++; }
      renderCalendar();
    });

    document.getElementById('calToday').addEventListener('click', function () {
      var now = new Date();
      calState.year = now.getFullYear();
      calState.month = now.getMonth();
      selectCalendarDay(getTodayLocal());
      renderCalendar();
    });

    renderCalendar();
  }

  function renderCalendar() {
    var months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    document.getElementById('calMonthYear').textContent = months[calState.month] + ' ' + calState.year;

    var container = document.getElementById('calDays');
    container.innerHTML = '';

    var firstDay = new Date(calState.year, calState.month, 1);
    var startWeekday = firstDay.getDay(); // 0=dom
    var offset = startWeekday === 0 ? 6 : startWeekday - 1; // Lun=0

    var daysInMonth = new Date(calState.year, calState.month + 1, 0).getDate();
    var todayStr = getTodayLocal();

    for (var i = 0; i < offset; i++) {
      var empty = document.createElement('div');
      empty.className = 'cal-day empty';
      container.appendChild(empty);
    }

    for (var d = 1; d <= daysInMonth; d++) {
      var dayEl = document.createElement('div');
      dayEl.className = 'cal-day';
      dayEl.textContent = d;

      var dateStr = calState.year + '-' +
        String(calState.month + 1).padStart(2, '0') + '-' +
        String(d).padStart(2, '0');

      var dayOfWeek = new Date(calState.year, calState.month, d).getDay();
      var isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (isWeekend) dayEl.classList.add('weekend');
      if (dateStr === todayStr) dayEl.classList.add('today');
      if (dateStr === calState.selectedDate) dayEl.classList.add('selected');

      if (dateStr < todayStr) {
        dayEl.classList.add('disabled');
      } else {
        dayEl.dataset.date = dateStr;
        dayEl.addEventListener('click', function () {
          selectCalendarDay(this.dataset.date);
        });
      }

      container.appendChild(dayEl);
    }
  }

  /**
   * @param {string} dateStr
   */
  function selectCalendarDay(dateStr) {
    calState.selectedDate = dateStr;
    el.dateInput.value = dateStr;
    renderCalendar();
    el.dateInput.dispatchEvent(new Event('change'));
  }

  /**
   * @param {number} step
   */
  function setBookingStep(step) {
    currentBookingStep = Math.max(1, Math.min(4, step));
    [1, 2, 3, 4].forEach(function (i) {
      var section = document.getElementById('step' + i);
      if (section) section.classList.toggle('active', i === currentBookingStep);
    });
    document.querySelectorAll('#bookingStepper .step').forEach(function (stepEl) {
      var stepNum = parseInt(stepEl.dataset.step, 10);
      stepEl.classList.toggle('active', stepNum === currentBookingStep);
      stepEl.classList.toggle('completed', stepNum < currentBookingStep);
    });

    el.prevStepBtn.style.display = currentBookingStep === 1 ? 'none' : 'inline-flex';
    if (currentBookingStep === 4) {
      el.nextStepBtn.style.display = 'none';
      el.submitBtn.style.display = 'inline-flex';
    } else {
      el.nextStepBtn.style.display = 'inline-flex';
      el.submitBtn.style.display = 'none';
    }

    if (currentBookingStep === 3) {
      el.slotsContainer.style.display = 'block';
      loadAvailableSlots();
    }
  }

  function goToNextBookingStep() {
    if (currentBookingStep === 1) {
      if (!el.serviceSelect.value) {
        showResult('❌ Seleccioná un servicio para continuar', 'error');
        return;
      }
      setBookingStep(2);
      return;
    }
    if (currentBookingStep === 2) {
      if (!el.dateInput.value) {
        showResult('❌ Elegí una fecha para continuar', 'error');
        return;
      }
      setBookingStep(3);
      return;
    }
    if (currentBookingStep === 3) {
      if (!el.selectedSlot.value) {
        el.slotError.classList.add('visible');
        el.slotsContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      setBookingStep(4);
    }
  }

  function goToPrevBookingStep() {
    if (currentBookingStep > 1) {
      setBookingStep(currentBookingStep - 1);
    }
  }

  window.selectStaffFromCard = function(cardElement, staffId) {
    if (!staffId || !el.staffSelect) return;
    el.staffSelect.value = staffId;
    el.reservar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    loadAvailableSlots();
  };

  /** @returns {Promise<void>} */
  async function loadAvailableSlots() {
    var serviceId = el.serviceSelect.value;
    var date = el.dateInput.value;
    var staffId = el.staffSelect ? el.staffSelect.value : '';
    var previousSelectedSlot = el.selectedSlot.value;

    document.querySelectorAll('.team-card').forEach(function(c) {
      if (staffId && c.dataset.staffId === staffId.toString()) {
        c.classList.add('selected');
      } else {
        c.classList.remove('selected');
      }
    });

    if (!serviceId || !date) {
      el.slotsContainer.style.display = 'none';
      return;
    }

    if (slotsAbortController) slotsAbortController.abort();
    slotsAbortController = new AbortController();

    el.slotsContainer.style.display = 'block';
    el.slotsList.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:#64748b">⏳ Buscando horarios...</div>';
    el.slotError.classList.remove('visible');

    try {
      var url = staffId 
        ? API_BASE + '/p/' + encodeURIComponent(slug) + '/staff/' + encodeURIComponent(staffId) + '/availability?date=' + encodeURIComponent(date) + '&serviceId=' + encodeURIComponent(serviceId)
        : API_BASE + '/p/' + encodeURIComponent(slug) + '/availability?date=' + encodeURIComponent(date) + '&serviceId=' + encodeURIComponent(serviceId);
      var res = await fetchWithTimeout(url, { signal: slotsAbortController.signal });

      if (!res.ok) throw new Error('Error del servidor');

      var slots = await res.json();

      if (!slots.length) {
        if (staffId) {
          el.slotsList.innerHTML =
            '<div style="grid-column:1/-1;text-align:center;padding:20px;color:#64748b;background:#f8fafc;border-radius:8px">' +
            '😔 No hay horarios para este día con ese peluquero<br>' +
            '<div style="margin-top:10px;display:flex;gap:8px;justify-content:center">' +
            '<button type="button" id="btnFindNext" class="slot-btn" style="background:#e2e8f0;color:#0f172a;padding:8px 12px;border-radius:6px;">Ver próxima fecha disponible</button>' +
            '<button type="button" id="btnChooseOther" class="slot-btn" style="background:#f8fafc;color:#0f172a;padding:8px 12px;border-radius:6px;">Elegir otro peluquero</button>' +
            '</div>' +
            '</div>';

          setTimeout(function () {
            var btnNext = document.getElementById('btnFindNext');
            var btnOther = document.getElementById('btnChooseOther');
            if (btnNext) btnNext.addEventListener('click', async function () {
              btnNext.disabled = true; btnNext.textContent = '⏳ Buscando...';
              var found = await findNextAvailableDate(staffId, serviceId, date, 21);
              if (found) {
                el.dateInput.value = found;
                calState.selectedDate = found;
                var parts = found.split('-');
                calState.year = parseInt(parts[0]);
                calState.month = parseInt(parts[1]) - 1;
                renderCalendar();
                loadAvailableSlots();
              } else {
                btnNext.textContent = 'No se encontró en 3 semanas';
                setTimeout(function () { btnNext.textContent = 'Ver próxima fecha disponible'; btnNext.disabled = false; }, 2500);
              }
            });

            if (btnOther) btnOther.addEventListener('click', function () {
              if (el.staffSelect) {
                el.staffSelect.value = '';
                el.staffSelect.focus();
                loadAvailableSlots();
              }
            });
          }, 0);

        } else {
          el.slotsList.innerHTML =
            '<div style="grid-column:1/-1;text-align:center;padding:20px;color:#64748b;background:#f8fafc;border-radius:8px">' +
            '😔 No hay horarios para este día<br>' +
            '<small style="margin-top:8px;display:block;opacity:0.8">Probá con otra fecha o elegí un peluquero distinto</small>' +
            '</div>';
        }

        return;
      }

      el.slotsList.innerHTML = slots.map(function (slot) {
        return '<button type="button" class="slot-btn" data-slot="' + escapeHtml(slot) + '">' + formatTime(slot) + '</button>';
      }).join('');

      if (previousSelectedSlot) {
        var selectedBtn = el.slotsList.querySelector('[data-slot="' + previousSelectedSlot + '"]');
        if (selectedBtn) {
          selectedBtn.classList.add('selected');
        } else {
          el.selectedSlot.value = '';
        }
      }

    } catch (err) {
      if (err.name === 'AbortError') return;
      el.slotsList.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:#ef4444">❌ Error al cargar horarios</div>';
    }
  }

  /**
   * @param {string} dateStr
   * @param {number} days
   * @returns {string}
   */
  function addDays(dateStr, days) {
    var d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0,10);
  }

  /**
   * @param {number|string} staffId
   * @param {number|string} serviceId
   * @param {string} startDate
   * @param {number} maxDays
   * @returns {Promise<string|null>}
   */
  async function findNextAvailableDate(staffId, serviceId, startDate, maxDays) {
    maxDays = maxDays || 21;
    for (var i = 1; i <= maxDays; i++) {
      var checkDate = addDays(startDate, i);
      try {
        var url = API_BASE + '/p/' + encodeURIComponent(slug) + '/staff/' + encodeURIComponent(staffId) + '/availability?date=' + encodeURIComponent(checkDate) + '&serviceId=' + encodeURIComponent(serviceId);
        var res = await fetchWithTimeout(url);
        if (!res.ok) continue;
        var slots = await res.json();
        if (slots && slots.length) return checkDate;
      } catch (err) {
        continue;
      }
    }
    return null;
  }

  /**
   * @param {SubmitEvent} e
   * @returns {Promise<void>}
   */
  async function handleBooking(e) {
    e.preventDefault();
    el.slotError.classList.remove('visible');
    el.phoneError.classList.remove('visible');

    if (!el.selectedSlot.value) {
      el.slotError.classList.add('visible');
      el.slotsContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    var phone = document.getElementById('clientPhone').value.trim();
    if (!isValidPhone(phone)) {
      el.phoneError.classList.add('visible');
      document.getElementById('clientPhone').focus();
      return;
    }

    var name = document.getElementById('clientName').value.trim();
    if (name.length < 2) {
      showResult('❌ Ingresá tu nombre completo', 'error');
      document.getElementById('clientName').focus();
      return;
    }

    var serviceId = parseInt(el.serviceSelect.value, 10);
    if (isNaN(serviceId)) {
      showResult('❌ Seleccioná un servicio válido', 'error');
      return;
    }

    el.submitBtn.disabled = true;
    el.submitBtn.textContent = '⏳ Procesando...';

    try {
      var payload = {
        clientName: name,
        clientPhone: phone,
        clientEmail: document.getElementById('clientEmail').value.trim(),
        serviceId: serviceId,
        staffId: el.staffSelect && el.staffSelect.value ? parseInt(el.staffSelect.value, 10) : null,
        appointmentDate: el.selectedSlot.value,
        notes: document.getElementById('notes').value.trim()
      };

      var url = API_BASE + '/p/' + encodeURIComponent(slug) + '/appointments';
      var res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      var data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reservar');

      showResult('✅ ¡Turno reservado!<br><small>Te contactaremos al ' + escapeHtml(payload.clientPhone) + '</small>', 'success');
      el.bookingForm.reset();
      el.slotsContainer.style.display = 'none';
      el.selectedSlot.value = '';
      el.dateInput.min = getTodayLocal();
      setBookingStep(1);

    } catch (err) {
      showResult('❌ ' + escapeHtml(err.message), 'error');
    } finally {
      el.submitBtn.disabled = false;
      el.submitBtn.textContent = '✅ Confirmar Reserva';
    }
  }

  /**
   * @param {string} message
   * @param {'success'|'error'|'info'} type
   */
  function showResult(message, type) {
    el.result.className = 'result ' + type;
    el.result.innerHTML = message;
    el.result.style.display = 'block';
    el.result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (type === 'success') setTimeout(function () { el.result.style.display = 'none'; }, 8000);
  }

  // ─── LIGHTBOX ───────────────────────────────────
  function initLightbox() {
    el.galleryGrid.addEventListener('click', function (e) {
      var item = e.target.closest('.gallery-item');
      if (!item) return;
      openLightbox(parseInt(item.dataset.index, 10));
    });

    el.lbClose.addEventListener('click', closeLightbox);
    el.lbPrev.addEventListener('click', prevImage);
    el.lbNext.addEventListener('click', nextImage);
    el.lightbox.addEventListener('click', function (e) {
      if (e.target === el.lightbox) closeLightbox();
    });

    document.addEventListener('keydown', function (e) {
      if (el.lightbox.style.display !== 'flex') return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    });
  }

  /**
   * @param {number} index
   */
  function openLightbox(index) {
    if (!galleryImages.length) return;
    currentImageIndex = index;
    updateLightboxImage();
    el.lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    el.lightbox.style.display = 'none';
    document.body.style.overflow = '';
  }

  function nextImage() {
    if (!galleryImages.length) return;
    currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
    updateLightboxImage();
  }

  function prevImage() {
    if (!galleryImages.length) return;
    currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
    updateLightboxImage();
  }

  function updateLightboxImage() {
    var fixedUrl = fixImageUrl(galleryImages[currentImageIndex]);
    el.lightboxImg.src = fixedUrl;
    el.lightboxCounter.textContent = (currentImageIndex + 1) + ' / ' + galleryImages.length;
  }

  // ─── LAYOUT (reordenar/ocultar secciones) ──────
  var DEFAULT_LAYOUT = [
    { id: 'hero', type: 'hero', enabled: true },
    { id: 'servicios', type: 'services', enabled: true },
    { id: 'galeria', type: 'gallery', enabled: true },
    { id: 'equipo', type: 'team', enabled: true },
    { id: 'reservar', type: 'booking', enabled: true }
  ];

  function applyLayout() {
    var layout = tenantData.landing_layout || DEFAULT_LAYOUT;
    var sectionMap = {
      hero: el.hero,
      servicios: el.servicios,
      galeria: el.galeria,
      equipo: el.equipo,
      reservar: el.reservar
    };

    layout.forEach(function (item) {
      if (item.type === 'custom') {
        var existing = document.getElementById(item.id);
        if (existing) existing.remove();
        var customEl = document.createElement('section');
        customEl.id = item.id;
        customEl.className = item.enabled !== false ? 'custom-section' : 'custom-section';
        customEl.style.cssText = 'padding: 60px 24px;';
        if (item.title) {
          var titleEl = document.createElement('h2');
          titleEl.className = 'section-title';
          titleEl.textContent = item.title;
          customEl.appendChild(titleEl);
        }
        var contentDiv = document.createElement('div');
        contentDiv.style.cssText = 'max-width: 800px; margin: 0 auto; text-align: center;';
        contentDiv.innerHTML = item.content || '';
        customEl.appendChild(contentDiv);
        if (item.enabled === false) customEl.style.display = 'none';
        pageContent.appendChild(customEl);
        return;
      }

      var sectionEl = sectionMap[item.id];
      if (!sectionEl) return;

      if (item.enabled === false) {
        sectionEl.style.display = 'none';
      } else {
        sectionEl.style.display = '';
        pageContent.appendChild(sectionEl);
      }
    });

    var footer = document.querySelector('.footer');
    if (footer) pageContent.appendChild(footer);
  }

  // ─── START ──────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

})();
