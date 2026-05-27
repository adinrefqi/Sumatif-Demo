/**
 * ============================================================
 *  UI Improvements – SMP THHK Sumatif Demo Exam Portal
 * ============================================================
 *  Enhances the existing dark-mode exam portal with:
 *    1. Enhanced Status Bar (user info + connection indicator)
 *    2. Exam Card Date/Time Info & live status
 *    3. Jadwal "Today" Highlight
 *    4. Bottom Navigation (mobile ≤ 768 px)
 *    5. Upgraded Toast Notification System
 *    6. Skeleton Loading helpers
 *    7. Scroll-based Active Nav (ScrollSpy)
 *
 *  Dependencies (already present in the host page):
 *    - sessionStorage keys: isLoggedIn, role, nomorUjian, namaSiswa, user_grade
 *    - localStorage keys : user_grade
 *    - Global: activeClass, showToast(), scheduleData, Supabase, AOS
 * ============================================================
 */

/* ───────── schedule reference (mirrors the host page, using global) ───────── */

/* ───────── Indonesian month map (0-indexed) ───────── */
const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/* ───────── card-ID → schedule key mapping ───────── */
const CARD_KEY_MAP = {
  'card-agama':       'agama',
  'card-b-indo':      'b-indo',
  'card-b-inggris':   'b-inggris',
  'card-seni':        'seni',
  'card-matematika':  'matematika',
  'card-pjok':        'pjok',
  'card-ipa':         'ipa',
  'card-ppkn':        'ppkn',
  'card-ips':         'ips',
  'card-b-jawa':      'b-jawa',
  'card-informatika': 'informatika',
  'card-b-mandarin':  'b-mandarin',
  'card-bk':          'bk',
  'card-coding':      'coding'
};

// ─────────────────────────────────────────────────────────────
//  1. ENHANCED STATUS BAR
// ─────────────────────────────────────────────────────────────

/**
 * Injects user info (name, role, class/room) and a connection
 * indicator into the existing `.status-bar` element.
 * Only renders when the user is authenticated.
 */
function enhanceStatusBar() {
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) return;

  const statusContent = document.querySelector('.status-content');
  if (!statusContent) return;

  const userName  = sessionStorage.getItem('namaSiswa') || 'Pengguna';
  const userRole  = sessionStorage.getItem('role')      || 'siswa';
  const userGrade = sessionStorage.getItem('user_grade')
                 || localStorage.getItem('user_grade')  || '-';

  // Role label mapping
  const roleLabelMap = { siswa: 'Siswa', guru: 'Guru', admin: 'Admin' };
  const roleLabel = roleLabelMap[userRole] || userRole;

  // Build extra status items
  const fragment = document.createDocumentFragment();

  // — User name & role
  const userItem = _createStatusItem(
    'fas fa-user-circle',
    `Pengguna <span style="text-transform:none;opacity:0.8;">(${roleLabel})</span>`,
    userName
  );
  fragment.appendChild(userItem);

  // Add divider
  const div2 = document.createElement('div');
  div2.className = 'status-divider';
  fragment.appendChild(div2);

  // — Class / room
  const classItem = _createStatusItem(
    'fas fa-school',
    'Kelas',
    userGrade
  );
  fragment.appendChild(classItem);

  // Add divider
  const div3 = document.createElement('div');
  div3.className = 'status-divider';
  fragment.appendChild(div3);

  // — Connection indicator
  const connItem = _createStatusItem(
    'fas fa-wifi',
    'Status Koneksi',
    `<span id="ui-conn-dot" class="conn-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#4ade80;margin-right:6px;box-shadow:0 0 8px rgba(74,222,128,0.5);animation: statusPulse 2s infinite;"></span> <span id="ui-conn-text">Online</span>`
  );
  fragment.appendChild(connItem);

  statusContent.appendChild(fragment);
}

/** Helper: wrap HTML string in a proper `.status-item` div */
function _createStatusItem(iconClass, labelText, valueHtml) {
  const div = document.createElement('div');
  div.className = 'status-item';
  div.innerHTML = `
    <i class="${iconClass}"></i>
    <div class="status-text">
        <span class="label">${labelText}</span>
        <span class="value" style="font-size:1.1rem;">${valueHtml}</span>
    </div>
  `;
  return div;
}

// ─────────────────────────────────────────────────────────────
//  2. EXAM CARD DATE / TIME INFO + LIVE STATUS
// ─────────────────────────────────────────────────────────────

/**
 * For every exam card listed in CARD_KEY_MAP:
 *  • Injects a `.exam-card-info` line (date + time range).
 *  • Updates the `.card-status` badge to reflect whether the
 *    exam is completed, ongoing, or upcoming.
 */
function enhanceExamCards() {
  const now = new Date();

  Object.entries(CARD_KEY_MAP).forEach(([cardId, key]) => {
    const card = document.getElementById(cardId);
    const info = scheduleData[key];
    if (!card || !info) return;

    // ── Inject date/time info below <h3> ──
    const heading = card.querySelector('h3');
    if (heading && !card.querySelector('.exam-card-info')) {
      const dateObj   = _parseISODate(info.date);
      const niceDate  = `${dateObj.getDate()} ${MONTH_NAMES_ID[dateObj.getMonth()]}`;
      const infoDiv   = document.createElement('div');
      infoDiv.className = 'exam-card-info';
      infoDiv.innerHTML =
        `<span class="exam-card-date"><i class="far fa-calendar"></i> ${niceDate}</span>` +
        `<span class="exam-card-time"><i class="far fa-clock"></i> ${info.start} - ${info.end}</span>`;
      heading.insertAdjacentElement('afterend', infoDiv);
    }

    // ── Update card status badge ──
    const statusEl = card.querySelector('.card-status');
    if (!statusEl) return;

    const examStart = _buildDateTime(info.date, info.start);
    const examEnd   = _buildDateTime(info.date, info.end);

    if (now > examEnd) {
      // Exam is finished
      statusEl.textContent = 'Selesai';
      statusEl.classList.remove('ongoing', 'upcoming');
      statusEl.classList.add('completed');
    } else if (now >= examStart && now <= examEnd) {
      // Exam is running right now
      statusEl.textContent = 'Berlangsung';
      statusEl.classList.remove('completed', 'upcoming');
      statusEl.classList.add('ongoing');
    } else {
      // Exam hasn't started yet
      statusEl.textContent = 'Akan Datang';
      statusEl.classList.remove('completed', 'ongoing');
      statusEl.classList.add('upcoming');
    }
  });
}

/** Parse an ISO date string (YYYY-MM-DD) into a local Date at midnight */
function _parseISODate(isoStr) {
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Build a Date from ISO date + HH:MM time strings */
function _buildDateTime(isoDate, time) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const [h, min]  = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min, 0);
}

// ─────────────────────────────────────────────────────────────
//  3. JADWAL "TODAY" HIGHLIGHT
// ─────────────────────────────────────────────────────────────

/**
 * Scans every `.jadwal-day-card`, parses its Indonesian date
 * header, and marks cards as `.today` or `.past`.
 * Injects a "HARI INI" badge on today's card.
 */
function highlightTodaySchedule() {
  const cards = document.querySelectorAll('.jadwal-day-card');
  if (!cards.length) return;

  const today     = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  cards.forEach(card => {
    const header = card.querySelector('.day-header');
    if (!header) return;

    const cardDate = _parseIndonesianDate(header.textContent.trim());
    if (!cardDate) return;

    const cardDateMidnight = new Date(
      cardDate.getFullYear(), cardDate.getMonth(), cardDate.getDate()
    );

    if (cardDateMidnight.getTime() === todayDate.getTime()) {
      card.classList.add('today');
      // Inject the "HARI INI" badge (only once)
      if (!header.querySelector('.jadwal-today-badge')) {
        const badge = document.createElement('span');
        badge.className = 'jadwal-today-badge';
        badge.textContent = 'HARI INI';
        header.appendChild(badge);
      }
    } else if (cardDateMidnight < todayDate) {
      card.classList.add('past');
    }
  });
}

/**
 * Parse a date string like "Jumat, 29 Mei 2026" into a JS Date.
 * Ignores the day-of-week name; extracts day, month-name, year.
 */
function _parseIndonesianDate(text) {
  // Remove day-of-week prefix (everything before the comma)
  const afterComma = text.includes(',') ? text.split(',')[1].trim() : text.trim();

  // Expected format: "29 Mei 2026"
  const parts = afterComma.split(/\s+/);
  if (parts.length < 3) return null;

  const day       = parseInt(parts[0], 10);
  const monthIdx  = MONTH_NAMES_ID.indexOf(parts[1]);
  const year      = parseInt(parts[2], 10);

  if (isNaN(day) || monthIdx === -1 || isNaN(year)) return null;
  return new Date(year, monthIdx, day);
}

// ─────────────────────────────────────────────────────────────
//  4. BOTTOM NAVIGATION (MOBILE)
// ─────────────────────────────────────────────────────────────

/**
 * Builds a fixed bottom navigation bar with 4 items.
 * Only created when the viewport is ≤ 768 px.
 * Active state is updated via IntersectionObserver.
 */
function createBottomNav() {
  const mq = window.matchMedia('(max-width: 768px)');
  if (!mq.matches) return;                // desktop — skip
  if (document.querySelector('.bottom-nav')) return; // already exists

  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';

  const items = [
    { href: '#home',   icon: 'fa-home',           label: 'Beranda' },
    { href: '#akses',  icon: 'fa-pen-to-square',   label: 'Ujian'   },
    { href: '#jadwal', icon: 'fa-calendar-days',    label: 'Jadwal'  },
    { href: '#profil', icon: 'fa-user',             label: 'Profil'  }
  ];

  items.forEach(({ href, icon, label }) => {
    const a = document.createElement('a');
    a.className = 'bottom-nav-item';
    a.href = href;
    a.innerHTML = `<i class="fas ${icon}"></i><span>${label}</span>`;

    // "Profil" opens the logout modal instead of scrolling
    if (href === '#profil') {
      a.addEventListener('click', e => {
        e.preventDefault();
        const logoutModal = document.getElementById('logoutModal');
        if (logoutModal) logoutModal.style.display = 'flex';
      });
    }

    nav.appendChild(a);
  });

  mainContent.appendChild(nav);

  // ── Active-state tracking via IntersectionObserver ──
  _observeBottomNavSections(nav);
}

/** Observe key sections and update the active bottom-nav item */
function _observeBottomNavSections(nav) {
  const sectionIds = ['home', 'akses', 'jadwal'];
  const links      = nav.querySelectorAll('.bottom-nav-item');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      links.forEach(link => {
        link.classList.toggle(
          'active',
          link.getAttribute('href') === `#${id}`
        );
      });
    });
  }, { rootMargin: '0px', threshold: 0.35 });

  sectionIds.forEach(id => {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  });
}

// ─────────────────────────────────────────────────────────────
//  5. UPGRADED TOAST NOTIFICATION SYSTEM
// ─────────────────────────────────────────────────────────────

/** Icon map per toast type */
const TOAST_ICONS = {
  success: 'check-circle',
  error:   'exclamation-circle',
  info:    'info-circle',
  warning: 'exclamation-triangle'
};

const TOAST_AUTO_DISMISS_MS = 4000;
const TOAST_MAX_VISIBLE     = 3;

/**
 * Replaces the global `showToast` with an enhanced version that
 * supports typed toasts, stacking, progress bars, and auto-dismiss.
 */
function upgradeToastSystem() {
  // Ensure a stack container exists
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }

  // Override the global function
  window.showToast = (message, typeOrBool = 'info') => {
    // Backward compatibility: boolean → type string
    let type;
    if (typeof typeOrBool === 'boolean') {
      type = typeOrBool ? 'error' : 'success';
    } else {
      type = TOAST_ICONS[typeOrBool] ? typeOrBool : 'info';
    }

    const icon = TOAST_ICONS[type];

    // Build toast element
    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML =
      `<div class="toast-icon"><i class="fas fa-${icon}"></i></div>` +
      `<span class="toast-msg">${message}</span>` +
      `<button class="toast-close" onclick="this.parentElement.remove()">×</button>` +
      `<div class="toast-progress"></div>`;

    stack.appendChild(toast);

    // Enforce max visible toasts (remove oldest first)
    while (stack.children.length > TOAST_MAX_VISIBLE) {
      stack.removeChild(stack.firstElementChild);
    }

    // Auto-dismiss with CSS-driven progress bar
    const progressBar = toast.querySelector('.toast-progress');
    if (progressBar) {
      progressBar.style.transition = `width ${TOAST_AUTO_DISMISS_MS}ms linear`;
      // Trigger reflow so the transition fires
      requestAnimationFrame(() => {
        progressBar.style.width = '0%';
      });
    }

    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, TOAST_AUTO_DISMISS_MS);
  };
}

// ─────────────────────────────────────────────────────────────
//  6. SKELETON LOADING
// ─────────────────────────────────────────────────────────────

/**
 * Replace the contents of a container with skeleton placeholders.
 * @param {string} containerId – ID of the target container element.
 * @param {number} [count=3]   – Number of skeleton cards to render.
 */
function showSkeleton(containerId, count = 3) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Preserve original content so it can be restored later
  if (!container.dataset.originalHtml) {
    container.dataset.originalHtml = container.innerHTML;
  }

  let skeletonHtml = '';
  for (let i = 0; i < count; i++) {
    skeletonHtml += `
      <div class="skeleton skeleton-card">
        <div class="skeleton-text" style="width:60%;height:18px;"></div>
        <div class="skeleton-text" style="width:90%;height:14px;margin-top:10px;"></div>
        <div class="skeleton-text" style="width:75%;height:14px;margin-top:8px;"></div>
      </div>`;
  }

  container.innerHTML = skeletonHtml;
}

/**
 * Remove skeleton placeholders and restore original content.
 * @param {string} containerId – ID of the target container element.
 */
function hideSkeleton(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (container.dataset.originalHtml) {
    container.innerHTML = container.dataset.originalHtml;
    delete container.dataset.originalHtml;
  } else {
    // If no original was stored, simply clear skeletons
    container.querySelectorAll('.skeleton').forEach(el => el.remove());
  }
}

// ─────────────────────────────────────────────────────────────
//  7. SCROLL-BASED ACTIVE NAV  (ScrollSpy)
// ─────────────────────────────────────────────────────────────

/**
 * Watches key page sections with IntersectionObserver and
 * toggles `.nav-active` on the corresponding `.nav-links a`.
 */
function initScrollSpy() {
  const sectionIds = ['home', 'akses', 'admin', 'jadwal', 'panduan'];
  const navLinks   = document.querySelectorAll('.nav-links a');
  if (!navLinks.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const sectionId = entry.target.id;
      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === `#${sectionId}`) {
          link.classList.add('nav-active');
        } else {
          link.classList.remove('nav-active');
        }
      });
    });
  }, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });

  sectionIds.forEach(id => {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  });
}

// ─────────────────────────────────────────────────────────────
//  8. INIT – wire everything up on DOMContentLoaded
// ─────────────────────────────────────────────────────────────

const UIImprovements = {
  /** Bootstrap all UI enhancements. */
  init() {
    enhanceExamCards();
    highlightTodaySchedule();
    createBottomNav();
    initScrollSpy();
    upgradeToastSystem();
    enhanceStatusBar();
    console.log('✅ UI Improvements loaded');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Small delay so the host page's own scripts initialise first
  setTimeout(() => {
    UIImprovements.init();
  }, 500);
});
