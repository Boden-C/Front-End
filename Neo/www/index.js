// Neo Accounting Firm — Landing interactions
(function () {
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

  // Cycle subtitle text among languages
  const cycleEl = qs('.cycle');
  let keys = [];
  try { keys = JSON.parse(cycleEl?.getAttribute('data-keys') || '[]'); } catch { }
  let idx = 0;
  let cycleTimer;
  const ANIM_MS = 320; // match .32s in CSS

  const setCycle = (i) => {
    if (!cycleEl || !keys.length) return;
    cycleEl.classList.remove('fade-in');
    cycleEl.classList.add('fade-out');
    // After fade-out completes, swap text and fade in next frame
    window.setTimeout(() => {
      cycleEl.classList.add('hold');
      cycleEl.textContent = keys[i];
      // wait a frame to ensure DOM updates apply before fade-in
      requestAnimationFrame(() => {
        cycleEl.classList.remove('fade-out');
        cycleEl.classList.add('fade-in');
        cycleEl.classList.remove('hold');
      });
    }, ANIM_MS);
  };

  const startCycle = () => {
    if (!cycleEl || !keys.length) return;
    clearInterval(cycleTimer);
    cycleTimer = setInterval(() => {
      idx = (idx + 1) % keys.length;
      setCycle(idx);
    }, 2500);
  };
  if (keys.length) {
    startCycle();
  }

  // Language switching: updates button states and URL
  const langBtns = qsa('.lang-btn');
  const setLang = (lang) => {
    langBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false'));
    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    window.history.replaceState({}, '', url);
    document.documentElement.lang = lang === 'en' ? 'en' : lang;
  };
  langBtns.forEach(btn => btn.addEventListener('click', () => setLang(btn.dataset.lang)));

  // Initialize language from URL if provided
  (function initLangFromURL() {
    const url = new URL(window.location.href);
    const lang = url.searchParams.get('lang');
    const supported = ['en', 'zh-Hans', 'zh-Hant'];
    if (lang && supported.includes(lang)) {
      setLang(lang);
    } else {
      // Default to English
      setLang('en');
    }
  })();

  // Determine open/closed status using America/Chicago time
  const statusEl = qs('.status-text');
  function getCentralNow() {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const parts = fmt.formatToParts(new Date()).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
    const y = Number(parts.year), m = Number(parts.month), d = Number(parts.day), hh = Number(parts.hour), mm = Number(parts.minute);
    return new Date(y, m - 1, d, hh, mm);
  }

  function getStatus(now) {
    const day = now.getDay(); // 0 Sun ... 6 Sat
    const isWeekend = (day === 0 || day === 6);
    // Open Mon-Fri 09:00-17:00
    const open = new Date(now); open.setHours(9, 0, 0, 0);
    const close = new Date(now); close.setHours(17, 0, 0, 0);
    const isWeekday = !isWeekend;

    if (!isWeekday) {
      const daysToMon = (8 - day) % 7 || 1; // if Sun ->1, Sat ->2
      const next = new Date(now); next.setDate(now.getDate() + daysToMon); next.setHours(9, 0, 0, 0);
      return { open: false, label: 'Closed • Opens Monday 9:00 AM', next };
    }

    if (now < open) {
      return { open: false, label: 'Closed • Opens today 9:00 AM', next: open };
    }
    if (now >= open && now < close) {
      const mins = Math.max(0, Math.floor((close.getTime() - now.getTime()) / 60000));
      const h = Math.floor(mins / 60), m = mins % 60;
      const rem = h > 0 ? `${h}h ${m}m` : `${m}m`;
      return { open: true, label: `Open • Closes at 5:00 PM (in ${rem})`, next: close };
    }
    let next = new Date(now);
    do { next.setDate(next.getDate() + 1); } while (next.getDay() === 0 || next.getDay() === 6);
    next.setHours(9, 0, 0, 0);
    const nextWeekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][next.getDay()];
    return { open: false, label: `Closed • Opens ${nextWeekday} 9:00 AM`, next };
  }

  function updateStatus() {
    if (!statusEl) return;
    try {
      const now = getCentralNow();
      const st = getStatus(now);
      statusEl.textContent = st.label;
      statusEl.parentElement?.classList.toggle('is-open', !!st.open);
      const dt = qs('#business-status');
      if (dt) dt.setAttribute('datetime', now.toISOString());
    } catch (e) { /* no-op */ }
  }

  updateStatus();
  setInterval(updateStatus, 60 * 1000);

  // Respect reduced motion by pausing cycling
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handleMotion = () => {
    if (media.matches) { clearInterval(cycleTimer); cycleTimer = undefined; }
    else if (!cycleTimer) { startCycle(); }
  };
  media.addEventListener?.('change', handleMotion);
})();
