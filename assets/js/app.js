/* ==========================================================================
   Rose Noire — interactions du site
   Héros cinématique (la caméra traverse la vitrine au fil du défilement),
   révélations, compteurs, parallaxes, galerie continue, FAQ, horaires en
   direct, formulaire (validation, anti-spam, API ou e-mail), barre d’action
   mobile, cookies + mesure d’audience après accord, page 404.
   Chaque bloc est isolé : si l’un échoue, le reste du site fonctionne.
   ========================================================================== */
(() => {
  'use strict';
  const d = document.documentElement;
  const reduced = d.classList.contains('reduced');
  const BASE = d.dataset.base || '';
  const PAGE = d.dataset.page || '';
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const sstep = (a, b, x) => { if (x <= a) return 0; if (x >= b) return 1; const t = (x - a) / (b - a); return t * t * (3 - 2 * t); };
  const safe = (name, fn) => { try { fn(); } catch (error) { console.warn('[rose] ' + name, error); } };
  const SHOP_EMAIL = 'rosenoire160@hotmail.com';
  const KEY = 'rnb_';

  /* ---------- Mesure d’audience (Google Analytics 4, uniquement après accord) ---------- */
  const GA_ID = (d.dataset.ga || '').trim();
  function track(name, params) {
    if (window.gtag && window.__rnGa) window.gtag('event', name, params || {});
  }
  function loadAnalytics() {
    if (!GA_ID || window.__rnGa) return;
    window.__rnGa = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
  }
  function clearAnalyticsCookies() {
    const host = location.hostname.split('.');
    document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => /^_ga/.test(n)).forEach((n) => {
      for (let i = 0; i < host.length; i++) document.cookie = n + '=; Max-Age=0; path=/; domain=' + host.slice(i).join('.');
      document.cookie = n + '=; Max-Age=0; path=/';
    });
  }
  // Le choix est redemandé après 6 mois (durée annoncée dans la politique de confidentialité)
  function readConsent() {
    try {
      const c = JSON.parse(localStorage.getItem(KEY + 'consent') || 'null');
      if (c && c.date && Date.now() - Date.parse(c.date) > 182 * 864e5) return null;
      return c;
    } catch (e) { return null; }
  }
  safe('cookies', () => {
    const box = $('[data-cookie]');
    const main = box && $('[data-cookie-main]', box);
    const prefs = box && $('[data-cookie-prefs]', box);
    const toggle = box && $('[data-consent-analytics]', box);
    const consent = readConsent();
    if (consent && consent.analytics) loadAnalytics();
    if (!box) return;
    const open = (showPrefs) => {
      const c = readConsent();
      if (toggle) toggle.checked = !!(c && c.analytics);
      box.hidden = false;
      main.hidden = !!showPrefs;
      prefs.hidden = !showPrefs;
      const btn = $('[data-consent="customize"]', box);
      if (btn) btn.setAttribute('aria-expanded', String(!!showPrefs));
    };
    const save = (analytics) => {
      try { localStorage.setItem(KEY + 'consent', JSON.stringify({ analytics, date: new Date().toISOString().slice(0, 10), v: 1 })); } catch (e) { /* navigation privée */ }
      box.hidden = true;
      if (analytics) loadAnalytics();
      else {
        if (window.gtag && window.__rnGa) window.gtag('consent', 'update', { analytics_storage: 'denied' });
        clearAnalyticsCookies();
      }
    };
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-consent]');
      if (!b) return;
      const action = b.dataset.consent;
      if (action === 'accept') save(true);
      else if (action === 'refuse') save(false);
      else if (action === 'customize') open(true);
      else if (action === 'save') save(!!(toggle && toggle.checked));
    });
    $$('[data-cookie-open]').forEach((b) => b.addEventListener('click', () => open(true)));
    if (!consent) setTimeout(() => open(false), PAGE === 'index' ? (d.classList.contains('intro') ? 3600 : 2400) : 900);
  });

  // Clics suivis (boutons d’action, téléphone, WhatsApp, e-mail…)
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-track]');
    if (el) track(el.dataset.track, { link_url: el.getAttribute('href') || '', page: PAGE });
  });

  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Moteur commun des animations liées au défilement ---------- */
  const scrubbers = [];
  const visible = new Set();
  let rafId = 0;
  let lastY = window.scrollY;
  let velocity = 0;
  function requestTick() { if (!rafId) rafId = requestAnimationFrame(frame); }
  function frame() {
    rafId = 0;
    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;
    velocity += (Math.abs(dy) - velocity) * 0.12;
    let again = false;
    scrubbers.forEach((s) => { if (visible.has(s.el) && s.update(dy) === true) again = true; });
    if (again || velocity > 0.2) requestTick();
  }
  function addScrubber(el, update, margin) {
    if (!el) return;
    scrubbers.push({ el, update });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) visible.add(el); else visible.delete(el); });
        requestTick();
      }, { rootMargin: margin || '20% 0px 20% 0px' }).observe(el);
    } else visible.add(el);
  }
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick);

  /* ---------- En-tête : transparent sur le héros, voile ivoire ensuite ---------- */
  const header = $('[data-header]');
  const hero = $('[data-scrub]');
  safe('header', () => {
    if (!header) return;
    const update = () => {
      const y = window.scrollY;
      const limit = hero && !reduced ? hero.offsetHeight - (header.offsetHeight || 70) : 10;
      header.classList.toggle('is-solid', y > limit || d.classList.contains('menu-open'));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    // Lien actif selon la section affichée
    const links = $$('.hdr__nav a[data-nav]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const map = new Map(links.map((a) => [a.dataset.nav, a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = map.get(entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) { links.forEach((a) => a.classList.remove('is-active')); link.classList.add('is-active'); }
        else link.classList.remove('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  });

  /* ---------- Menu mobile ---------- */
  safe('menu', () => {
    const btn = $('[data-menu-toggle]');
    const menu = $('[data-menu]');
    if (!btn || !menu) return;
    const label = $('.sr-only', btn);
    const set = (open) => {
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (label) label.textContent = open ? 'Fermer le menu' : 'Ouvrir le menu';
      d.classList.toggle('menu-open', open);
      if (header) header.classList.toggle('is-solid', open || window.scrollY > (hero ? hero.offsetHeight - 70 : 10));
      if (open) { const first = $('a', menu); if (first) first.focus({ preventScroll: true }); }
    };
    btn.addEventListener('click', () => set(menu.hidden));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => {
      if (menu.hidden) return;
      if (e.key === 'Escape') { set(false); btn.focus(); }
      if (e.key === 'Tab') {
        const items = [btn, ...$$('a, button', menu)];
        const i = items.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 1180 && !menu.hidden) set(false); });
  });

  /* ---------- Ancres douces + présélection du formulaire ---------- */
  const formApi = {};
  safe('anchors', () => {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href*="#"]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const url = new URL(a.getAttribute('href'), location.href);
      if (url.pathname.replace(/index\.html$/, '') !== location.pathname.replace(/index\.html$/, '') || !url.hash) return;
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      if (target.id === 'contact' && formApi.preset) formApi.preset(a.dataset);
      const top = target.getBoundingClientRect().top + window.scrollY - (target.id === 'top' ? 0 : 70);
      window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
      history.replaceState(null, '', url.hash);
      if (target.id === 'contact') setTimeout(() => { const f = $('#contact-form [name="name"]'); if (f && fine) f.focus({ preventScroll: true }); }, reduced ? 0 : 1000);
    });
  });

  /* ---------- Héros cinématique : trois plans, la caméra avance et traverse ----------
     Chaque plan avance doucement (zoom sur son point focal). Au passage au plan
     suivant, la caméra « plonge » dans le point focal pendant que le plan suivant
     s’ouvre en iris depuis ce même point, avec un halo de lumière chaude.
     Les textes (beats) apparaissent et disparaissent selon la progression. */
  safe('scrub', () => {
    if (!hero || reduced) return;
    const stage = $('.scrub__stage', hero);
    const scenes = $$('[data-scene]', hero);
    const beats = $$('[data-beat]', hero);
    const chapters = $$('[data-chapter]', hero);
    const fill = $('[data-scrub-fill]', hero);
    const cue = $('.cue', hero);
    const T = [[0.27, 0.41], [0.58, 0.72]];     // passages plan 1 → 2, plan 2 → 3
    const CH = [0, 0.31, 0.62, 0.86];           // début de chaque chapitre
    const FADE = 0.05;
    let W = 1, H = 1, R = 1, last = -1, chapter = -1;
    const foci = scenes.map(() => ({ x: 0, y: 0 }));
    const measure = () => {
      W = stage.clientWidth || window.innerWidth;
      H = stage.clientHeight || window.innerHeight;
      R = Math.hypot(W, H);
      scenes.forEach((s, i) => {
        const img = $('img', s);
        const iw = img.naturalWidth || 1600, ih = img.naturalHeight || 1067;
        const k = Math.max(W / iw, H / ih);
        const dw = iw * k, dh = ih * k;
        foci[i] = {
          x: clamp((W - dw) / 2 + Number(s.dataset.fx || 0.5) * dw, W * 0.12, W * 0.88),
          y: clamp((H - dh) / 2 + Number(s.dataset.fy || 0.5) * dh, H * 0.15, H * 0.85)
        };
        s.style.transformOrigin = foci[i].x.toFixed(1) + 'px ' + foci[i].y.toFixed(1) + 'px';
      });
      last = -1;
    };
    const progress = () => {
      const travel = hero.offsetHeight - window.innerHeight;
      return travel > 0 ? clamp(-hero.getBoundingClientRect().top / travel, 0, 1) : 0;
    };
    const render = () => {
      const p = progress();
      if (Math.abs(p - last) < 0.0002) return;
      last = p;
      let leak = 0, lx = 50, ly = 50;
      scenes.forEach((s, i) => {
        const enter = i ? T[i - 1] : null;
        const exit = T[i] || null;
        const start = enter ? enter[0] : 0;
        const end = exit ? exit[1] : 1;
        if (p < start || (exit && p > end)) { s.style.visibility = 'hidden'; return; }
        s.style.visibility = 'visible';
        let scale = 1 + 0.12 * clamp((p - start) / (end - start), 0, 1);
        if (exit && p > exit[0]) { const t = (p - exit[0]) / (exit[1] - exit[0]); scale *= 1 + 1.15 * t * t * t; }
        s.style.transform = 'scale(' + scale.toFixed(4) + ')';
        if (enter && p < enter[1]) {
          const t = sstep(enter[0], enter[1], p);
          const f = foci[i - 1];
          const r = t * (R + 120);
          s.style.setProperty('--mask', 'radial-gradient(circle at ' + f.x.toFixed(0) + 'px ' + f.y.toFixed(0) + 'px, #000 ' + Math.max(0, r - 120).toFixed(0) + 'px, transparent ' + r.toFixed(0) + 'px)');
          const glow = Math.sin(Math.PI * t);
          if (glow > leak) { leak = glow; lx = f.x / W * 100; ly = f.y / H * 100; }
        } else s.style.removeProperty('--mask');
      });
      stage.style.setProperty('--leak', (leak * 0.8).toFixed(3));
      stage.style.setProperty('--lx', lx.toFixed(1) + '%');
      stage.style.setProperty('--ly', ly.toFixed(1) + '%');
      beats.forEach((b) => {
        const a = Number(b.dataset.in), z = Number(b.dataset.out);
        const op = sstep(a, a + FADE, p) * (1 - sstep(z - FADE, z, p));
        const dir = p < a + FADE ? 1 : -1;
        b.style.opacity = op.toFixed(3);
        b.style.transform = op > 0.999 ? '' : 'translate3d(0,' + ((1 - op) * 34 * dir).toFixed(1) + 'px,0)';
        b.style.visibility = op < 0.01 ? 'hidden' : 'visible';
        b.inert = op < 0.5;
      });
      let c = 0;
      CH.forEach((v, i) => { if (p >= v) c = i; });
      if (c !== chapter) { chapters.forEach((li, i) => li.classList.toggle('is-on', i === c)); chapter = c; }
      if (fill) fill.style.setProperty('--p', p.toFixed(4));
      if (cue) cue.style.opacity = String(1 - sstep(0.01, 0.06, p));
    };
    measure();
    scenes.forEach((s) => { const img = $('img', s); if (!img.complete) img.addEventListener('load', () => { measure(); render(); }, { once: true }); });
    window.addEventListener('resize', () => { measure(); render(); });
    // les plans suivants se décodent en avance pour un passage sans accroc
    scenes.slice(1).forEach((s) => { const img = $('img', s); if (img.decode) img.decode().catch(() => {}); });
    addScrubber(hero, () => { render(); }, '0px');
    render();
  });

  /* ---------- Titres : lignes qui montent derrière un masque ---------- */
  safe('lines', () => {
    $$('[data-lines]').forEach((el) => {
      // (pas d’attribut style dans le HTML injecté : la politique de sécurité CSP l’interdit)
      const parts = el.innerHTML.split(/<br\s*\/?>/i);
      el.innerHTML = parts.map((html) => '<span class="ml"><span>' + html.trim() + '</span></span>').join('');
      $$('.ml > span', el).forEach((s, i) => s.style.setProperty('--l', String(i)));
    });
  });

  /* ---------- Révélations à l’entrée dans l’écran ---------- */
  safe('reveal', () => {
    $$('[data-wordmark]').forEach((w) => {
      const text = w.textContent;
      w.textContent = '';
      Array.from(text).forEach((ch, i) => {
        const s = document.createElement('span');
        s.className = 'ch';
        s.style.setProperty('--i', String(i));
        s.textContent = ch === ' ' ? ' ' : ch;
        w.appendChild(s);
      });
      w.classList.add('is-split');
    });
    const groups = new Map();
    $$('[data-reveal]').forEach((el) => {
      const p = el.parentElement;
      const n = groups.get(p) || 0;
      groups.set(p, n + 1);
      if (n) el.style.setProperty('--d', Math.min(0.48, n * 0.08).toFixed(2) + 's');
    });
    const targets = $$('[data-reveal], [data-lines], [data-wordmark]');
    if (!('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach((el) => io.observe(el));
  });

  /* ---------- Chiffres qui comptent ---------- */
  safe('counters', () => {
    const nums = $$('[data-count]');
    if (!nums.length || reduced || !('IntersectionObserver' in window)) return;
    const run = (el) => {
      const to = Number(el.dataset.count);
      const from = to > 1000 ? to - 30 : 0;
      const t0 = performance.now();
      const step = (now) => {
        const t = clamp((now - t0) / 1600, 0, 1);
        el.textContent = String(Math.round(from + (to - from) * easeOut(t)));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      run(e.target);
      io.unobserve(e.target);
    }), { threshold: 0.6 });
    nums.forEach((el) => io.observe(el));
  });

  /* ---------- Parallaxes : image plein écran, lettre, citation ---------- */
  safe('parallax', () => {
    if (reduced) return;
    $$('[data-parallax]').forEach((img) => {
      const box = img.parentElement;
      addScrubber(box, () => {
        const r = box.getBoundingClientRect();
        img.style.setProperty('--py', ((r.top + r.height / 2 - window.innerHeight / 2) * -0.12).toFixed(1) + 'px');
      });
    });
    const letter = $('[data-letter]');
    if (letter) addScrubber(letter, () => {
      const r = letter.getBoundingClientRect();
      letter.style.setProperty('--p', easeOut(clamp((window.innerHeight - r.top) / (window.innerHeight * 0.8), 0, 1)).toFixed(4));
    });
  });
  safe('quote', () => {
    const quote = $('[data-words-quote]');
    const text = quote && $('[data-words]', quote);
    if (!text) return;
    const words = text.textContent.trim().split(/ +/);
    text.setAttribute('aria-label', text.textContent.trim());
    text.textContent = '';
    words.forEach((w, i) => {
      const s = document.createElement('span');
      s.className = 'wd';
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', String(i));
      s.textContent = w;
      text.appendChild(s);
      if (i < words.length - 1) text.appendChild(document.createTextNode(' '));
    });
    quote.style.setProperty('--n', String(words.length));
    if (reduced) { quote.style.setProperty('--p', '1'); return; }
    quote.style.setProperty('--p', '0');
    addScrubber(quote, () => {
      const r = quote.getBoundingClientRect();
      quote.style.setProperty('--p', clamp((window.innerHeight * 0.85 - r.top) / (window.innerHeight * 0.55), 0, 1).toFixed(4));
    });
  });

  /* ---------- Galerie : défile en continu, accélère et suit le sens du défilement ---------- */
  safe('marquee', () => {
    const track = $('[data-marquee]');
    if (!track) return;
    const row = track.firstElementChild;
    const clone = row.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    $$('img', clone).forEach((img) => { img.alt = ''; });
    track.appendChild(clone);
    if (reduced) return;
    let x = 0, dir = 1, boost = 0;
    addScrubber(track.parentElement, (dy) => {
      if (dy) dir = dy > 0 ? 1 : -1;
      boost += (Math.min(40, Math.abs(dy)) * 0.45 - boost) * 0.1;
      x -= (0.55 + boost) * dir;
      const w = row.offsetWidth;
      if (w) { if (x <= -w) x += w; if (x > 0) x -= w; }
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      return true;
    }, '10% 0px 10% 0px');
  });

  /* ---------- Questions fréquentes (une seule ouverte à la fois) ---------- */
  safe('faq', () => {
    $$('[data-accordion]').forEach((acc) => {
      const items = $$('.qa', acc);
      items.forEach((qa) => {
        const btn = $('button', qa);
        if (btn.getAttribute('aria-expanded') === 'true') qa.classList.add('is-open');
        btn.addEventListener('click', () => {
          const wasOpen = btn.getAttribute('aria-expanded') === 'true';
          items.forEach((o) => { o.classList.remove('is-open'); $('button', o).setAttribute('aria-expanded', 'false'); });
          if (!wasOpen) {
            qa.classList.add('is-open');
            btn.setAttribute('aria-expanded', 'true');
            track('faq_open', { question: btn.textContent.trim().slice(0, 80) });
          }
        });
      });
    });
  });

  /* ---------- Horaires en direct (heure de Bruxelles) ---------- */
  const SCHEDULE = { 0: [630, 1020], 1: null, 2: [720, 1170], 3: [720, 1170], 4: [720, 1170], 5: [720, 1170], 6: [630, 1170] };
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const fmt = (m) => Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + String(m % 60).padStart(2, '0') : '');
  function brusselsNow() {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Brussels', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const get = (t) => (parts.find((p) => p.type === t) || {}).value;
    return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')), minutes: Number(get('hour')) * 60 + Number(get('minute')) };
  }
  function hoursStatus() {
    const { day, minutes } = brusselsNow();
    const today = SCHEDULE[day];
    if (today && minutes >= today[0] && minutes < today[1]) {
      const left = today[1] - minutes;
      return { open: true, text: left <= 45 ? 'Ouvert · ferme bientôt (' + fmt(today[1]) + ')' : 'Ouvert maintenant · jusqu’à ' + fmt(today[1]) };
    }
    if (today && minutes < today[0]) return { open: false, text: 'Fermé · ouvre aujourd’hui à ' + fmt(today[0]) };
    for (let i = 1; i <= 7; i++) {
      const dd = (day + i) % 7;
      if (SCHEDULE[dd]) return { open: false, text: 'Fermé · ouvre ' + (i === 1 ? 'demain' : DAYS[dd]) + ' à ' + fmt(SCHEDULE[dd][0]) };
    }
    return { open: false, text: '' };
  }
  safe('hours', () => {
    const els = $$('[data-hours-status]');
    const lists = $$('[data-hours]');
    if (!els.length && !lists.length) return;
    const update = () => {
      const s = hoursStatus();
      els.forEach((el) => { el.textContent = s.text; el.classList.toggle('is-open', s.open); });
      const { day } = brusselsNow();
      lists.forEach((ul) => $$('li[data-day]', ul).forEach((li) => li.classList.toggle('is-today', li.dataset.day.split(',').includes(String(day)))));
    };
    update();
    setInterval(update, 60000);
  });

  /* ---------- Formulaire : commande (particulier) ou devis (entreprise) ---------- */
  safe('form', () => {
    const form = $('[data-form]');
    if (!form) return;
    const tabs = $('.tabs', form);
    const tabBtns = $$('[data-tab-btn]', form);
    const panels = $$('[data-panel]', form);
    const kind = form.elements.form;
    const errorBox = $('[data-form-error]', form);
    const success = $('[data-form-success]', form);
    const submit = $('[data-submit]', form);
    const chosen = $('[data-chosen]', form);
    const phoneStar = $('[data-phone-required]', form);
    const startedAt = Date.now();
    let active = 'perso';
    const PRODUCTS = { fraiches: 'Fleurs fraîches', anniversaire: 'Fleurs d’anniversaire', sechees: 'Fleurs séchées', artificielles: 'Fleurs artificielles', plantes: 'Plantes vertes & cactus', vases: 'Vases & décorations', deuil: 'Gerbe ou couronne', livraison: 'Livraison à domicile' };

    const setTab = (name, focus) => {
      active = name === 'pro' ? 'pro' : 'perso';
      tabBtns.forEach((b) => {
        const on = b.dataset.tabBtn === active;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
        if (on && focus) b.focus();
      });
      panels.forEach((p) => { p.hidden = p.dataset.panel !== active; });
      tabs.dataset.active = active;
      kind.value = active === 'pro' ? 'devis' : 'commande';
      if (phoneStar) phoneStar.hidden = active !== 'perso';
      form.elements.email.placeholder = active === 'pro' ? 'vous@entreprise.be' : 'vous@exemple.be';
      clearErrors();
    };
    tabBtns.forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tabBtn)));
    tabs.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      setTab(active === 'pro' ? 'perso' : 'pro', true);
    });

    const setProduct = (key) => {
      form.elements.produit.value = PRODUCTS[key] ? key : '';
      if (!chosen) return;
      chosen.hidden = !PRODUCTS[key];
      if (PRODUCTS[key]) $('[data-chosen-label]', chosen).textContent = 'Votre choix : ' + PRODUCTS[key];
    };
    if (chosen) $('[data-chosen-clear]', chosen).addEventListener('click', () => setProduct(''));
    const check = (name, value) => { const r = form.querySelector('input[name="' + name + '"][value="' + value + '"]'); if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); } };
    formApi.preset = (data) => {
      if (form.classList.contains('is-sent')) reset();
      if (data.tab) setTab(data.tab);
      if (data.need) check('besoin', data.need);
      if (data.occasion) check('occasion', data.occasion);
      if (data.product === 'livraison') check('mode', 'livraison');
      if (data.tab === 'perso') setProduct(data.product || '');
    };

    // Adresse demandée seulement pour une livraison
    const syncMode = () => {
      const delivery = (form.querySelector('input[name="mode"]:checked') || {}).value !== 'retrait';
      $$('[data-when="livraison"]', form).forEach((el) => { el.hidden = !delivery; });
    };
    form.addEventListener('change', (e) => { if (e.target.name === 'mode') syncMode(); });
    syncMode();

    // Date : pas avant aujourd’hui
    const dateInput = form.elements.date;
    if (dateInput) {
      const now = new Date();
      dateInput.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }

    const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;
    const PHONE_RE = /^\+?[0-9 ()./-]{8,20}$/;
    const TYPOS = { 'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.fr': 'gmail.com', 'gamil.com': 'gmail.com', 'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'outlok.com': 'outlook.com', 'outlook.co': 'outlook.com', 'yahoo.co': 'yahoo.com', 'skynet.b': 'skynet.be', 'telenet.b': 'telenet.be' };
    const val = (n) => (form.elements[n] ? String(form.elements[n].value || '').trim() : '');
    const radio = (n) => (form.querySelector('input[name="' + n + '"]:checked') || {}).value || '';

    function clearErrors() {
      $$('[aria-invalid="true"]', form).forEach((el) => el.removeAttribute('aria-invalid'));
      $$('.field__error', form).forEach((el) => { el.textContent = ''; });
      if (errorBox) errorBox.textContent = '';
    }
    function showError(name, message, html) {
      const input = form.elements[name];
      const box = $('#err-' + name, form);
      if (input && input.setAttribute) input.setAttribute('aria-invalid', 'true');
      if (box) { if (html) box.innerHTML = html; else box.textContent = message; }
    }
    form.addEventListener('input', (e) => {
      const n = e.target.name;
      if (!n || e.target.getAttribute('aria-invalid') !== 'true') return;
      e.target.removeAttribute('aria-invalid');
      const box = $('#err-' + n, form);
      if (box) box.textContent = '';
    });

    function collect() {
      const data = { form: kind.value, name: val('name'), email: val('email'), phone: val('phone'), message: val('message'), website: val('website'), elapsed: Date.now() - startedAt };
      if (active === 'pro') Object.assign(data, { besoin: radio('besoin'), societe: val('societe'), quand: val('quand') });
      else Object.assign(data, { occasion: radio('occasion'), mode: radio('mode'), budget: val('budget').replace(/[^\d.,]/g, '').replace(',', '.'), date: val('date'), adresse: radio('mode') === 'retrait' ? '' : val('adresse'), style: val('style'), produit: val('produit') });
      return data;
    }
    function validate(data) {
      const errors = {};
      if (data.name.length < 2) errors.name = 'Indiquez votre nom.';
      if (!data.email) errors.email = 'Indiquez votre adresse e-mail.';
      else if (!EMAIL_RE.test(data.email)) errors.email = 'Cette adresse e-mail ne semble pas valide.';
      if (data.phone && !PHONE_RE.test(data.phone)) errors.phone = 'Ce numéro ne semble pas valide.';
      if ((data.message.match(/https?:\/\/|www\./gi) || []).length > 1) errors.message = 'Un seul lien maximum dans le message, s’il vous plaît.';
      if (data.form === 'commande') {
        if (!data.phone) errors.phone = 'Indiquez un numéro : Sophie confirme chaque commande.';
        const budget = Number(data.budget);
        if (!data.budget || !isFinite(budget) || budget <= 0) errors.budget = 'Indiquez un budget en euros (ex. 60).';
        else if (budget > 5000) errors.budget = 'Pour un budget plus important, choisissez « Entreprise & événement ».';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) errors.date = 'Choisissez une date.';
        else {
          const dt = new Date(data.date + 'T12:00:00');
          if (dateInput && dateInput.min && data.date < dateInput.min) errors.date = 'Cette date est déjà passée.';
          else if (data.mode !== 'retrait' && dt.getDay() === 1) errors.date = 'Pas de livraison le lundi : la boutique est fermée.';
        }
        if (data.mode !== 'retrait' && data.adresse.length < 6) errors.adresse = 'Indiquez l’adresse de livraison.';
      }
      return errors;
    }
    function typoHint(email) {
      const at = email.lastIndexOf('@');
      if (at < 1) return '';
      const domain = email.slice(at + 1).toLowerCase();
      return TYPOS[domain] ? email.slice(0, at + 1) + TYPOS[domain] : '';
    }

    const LABELS = { besoin: { accueil: 'Fleurs d’accueil', evenement: 'Événement ou mariage', cadeaux: 'Cadeaux d’affaires', decor: 'Décor durable' }, occasion: { anniversaire: 'Anniversaire', amour: 'Amour', naissance: 'Naissance', merci: 'Merci', deuil: 'Deuil', plaisir: 'Pour le plaisir' }, mode: { livraison: 'Livraison (15 €)', retrait: 'Retrait en boutique' } };
    function mailto(data) {
      const lines = [];
      if (data.form === 'devis') {
        lines.push('Demande de devis — ' + (LABELS.besoin[data.besoin] || ''));
        if (data.societe) lines.push('Société ou lieu : ' + data.societe);
        if (data.quand) lines.push('Pour quand : ' + data.quand);
      } else {
        lines.push('Commande de fleurs — ' + (LABELS.occasion[data.occasion] || ''));
        if (data.produit && PRODUCTS[data.produit]) lines.push('Choix : ' + PRODUCTS[data.produit]);
        lines.push('Réception : ' + (LABELS.mode[data.mode] || ''));
        lines.push('Budget : ' + data.budget + ' €');
        lines.push('Date souhaitée : ' + data.date.split('-').reverse().join('/'));
        if (data.adresse) lines.push('Adresse de livraison : ' + data.adresse);
        if (data.style) lines.push('Style et couleurs : ' + data.style);
      }
      lines.push('', 'Nom : ' + data.name, 'E-mail : ' + data.email);
      if (data.phone) lines.push('Téléphone : ' + data.phone);
      if (data.message) lines.push('', data.message);
      const subject = (data.form === 'devis' ? 'Demande de devis' : 'Commande de fleurs') + ' — ' + data.name + (data.societe ? ' (' + data.societe + ')' : '');
      return 'mailto:' + SHOP_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
    }

    function showSuccess(data, viaMail) {
      const first = data.name.split(' ')[0];
      $('[data-success-name]', success).textContent = first ? ' ' + first : '';
      $('[data-success-text]', success).textContent = viaMail
        ? 'Votre messagerie s’est ouverte avec la demande prête à envoyer. Sophie vous répond dès réception.'
        : (data.form === 'devis' ? 'Sophie revient vers vous très vite avec une première proposition.' : 'Sophie vous contacte très vite pour confirmer le bouquet et la livraison.');
      form.classList.add('is-sent');
      success.hidden = false;
      success.focus({ preventScroll: true });
      try { localStorage.setItem(KEY + 'last_submit', String(Date.now())); } catch (e) { /* rien */ }
      track('generate_lead', { form_type: data.form, need: data.besoin || data.occasion || '', method: viaMail ? 'mailto' : 'api' });
    }
    function reset() {
      form.reset();
      form.classList.remove('is-sent');
      success.hidden = true;
      setProduct('');
      syncMode();
      clearErrors();
      setTab(active);
    }
    $('[data-form-reset]', form).addEventListener('click', () => { reset(); form.elements.name.focus(); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();
      const data = collect();
      // Anti-spam 1 : champ piège rempli par un robot → on fait comme si tout allait bien
      if (data.website) { showSuccess(data, false); return; }
      const errors = validate(data);
      const keys = Object.keys(errors);
      if (keys.length) {
        keys.forEach((k) => showError(k, errors[k]));
        if (errorBox) errorBox.textContent = keys.length > 1 ? 'Merci de corriger les ' + keys.length + ' champs indiqués.' : 'Merci de corriger le champ indiqué.';
        const firstBad = $('[aria-invalid="true"]', form); // le premier champ à corriger, dans l’ordre de la page
        if (firstBad) firstBad.focus();
        track('form_error', { form_type: data.form, fields: keys.join(',') });
        return;
      }
      const hint = typoHint(data.email);
      if (hint && !form.dataset.typoChecked) {
        form.dataset.typoChecked = '1';
        showError('email', '', 'Vouliez-vous dire <button type="button" data-fix-email>' + hint.replace(/[<>&"]/g, '') + '</button>&nbsp;?');
        const fix = $('[data-fix-email]', form);
        if (fix) fix.addEventListener('click', () => { form.elements.email.value = hint; form.elements.email.removeAttribute('aria-invalid'); $('#err-email', form).textContent = ''; });
        return;
      }
      // Anti-spam 2 : envoi trop rapide pour un humain
      if (data.elapsed < 3000) { if (errorBox) errorBox.textContent = 'Un instant… réessayez dans quelques secondes.'; return; }
      // Anti-spam 3 : une demande par minute depuis ce navigateur
      let last = 0;
      try { last = Number(localStorage.getItem(KEY + 'last_submit') || 0); } catch (err) { last = 0; }
      if (Date.now() - last < 60000) { if (errorBox) errorBox.textContent = 'Votre demande vient d’être envoyée. Patientez une minute avant d’en envoyer une autre.'; return; }

      const api = (d.dataset.api || '').trim().replace(/\/$/, '');
      if (!api) {
        // Sans API (maquette, hébergement statique) : la messagerie du visiteur prend le relais
        window.location.href = mailto(data);
        showSuccess(data, true);
        return;
      }
      submit.classList.add('is-busy');
      submit.setAttribute('aria-busy', 'true');
      const controller = 'AbortController' in window ? new AbortController() : null;
      const timer = setTimeout(() => controller && controller.abort(), 12000);
      try {
        const res = await fetch(api + '/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data),
          signal: controller ? controller.signal : undefined
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.ok) { showSuccess(data, false); return; }
        if (json.fields) Object.keys(json.fields).forEach((k) => showError(k, json.fields[k]));
        if (errorBox) errorBox.textContent = json.error || 'Envoi impossible pour le moment.';
      } catch (err) {
        if (errorBox) errorBox.innerHTML = 'Connexion impossible. <a href="' + mailto(data).replace(/"/g, '&quot;') + '">Envoyer la demande par e-mail</a> ou appelez le +32&nbsp;475&nbsp;61&nbsp;44&nbsp;58.';
      } finally {
        clearTimeout(timer);
        submit.classList.remove('is-busy');
        submit.removeAttribute('aria-busy');
      }
    });
    setTab('perso');
  });

  /* ---------- Barre d’action mobile : après le héros, cachée près du formulaire ---------- */
  safe('dock', () => {
    const dock = $('[data-dock]');
    if (!dock) return;
    const contact = $('#contact');
    const footer = $('.ftr');
    let near = false;
    if (contact && 'IntersectionObserver' in window) {
      const seen = new Set();
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
        near = seen.size > 0;
        update();
      }, { threshold: 0.05 });
      io.observe(contact);
      if (footer) io.observe(footer);
    }
    function update() {
      const after = hero && !reduced ? window.scrollY > hero.offsetHeight - window.innerHeight * 1.2 : window.scrollY > 300;
      dock.classList.toggle('is-on', after && !near);
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
  });

  /* ---------- Animations : réduire / réactiver ---------- */
  safe('motion', () => {
    $$('[data-motion-toggle]').forEach((b) => {
      b.textContent = reduced ? 'Réactiver les animations' : 'Réduire les animations';
      b.addEventListener('click', () => {
        try { localStorage.setItem(KEY + 'motion', reduced ? 'full' : 'reduce'); } catch (e) { /* rien */ }
        const url = new URL(location.href);
        url.searchParams.delete('motion');
        location.replace(url.toString());
      });
    });
  });

  /* ---------- Page 404 : retrouver la bonne page depuis l’ancienne adresse ---------- */
  safe('404', () => {
    if (PAGE !== '404') return;
    track('page_404', { path: location.pathname });
    const path = decodeURIComponent(location.pathname.toLowerCase());
    const guesses = [
      [/livraison|delivery|bezorg/, '#boutique', 'La livraison à domicile'],
      [/mariage|bruid|wedding/, '#boutique', 'Les fleurs de mariage'],
      [/gerbe|deuil|couronne|krans|rouw/, '#boutique', 'Les gerbes et couronnes'],
      [/sech|gedroog/, '#boutique', 'Les fleurs séchées'],
      [/artificiel|kunst/, '#boutique', 'Les fleurs artificielles'],
      [/cactus|plante|plant/, '#boutique', 'Les plantes vertes et cactus'],
      [/vase|vaas|deco/, '#boutique', 'Les vases et décorations'],
      [/anniversaire|verjaardag|bouquet|boeket|fraiche/, '#boutique', 'Les fleurs fraîches et d’anniversaire'],
      [/evenement|event|entreprise|corporate|hotel/, '#entreprises', 'Les fleurs pour les professionnels'],
      [/contact/, '#contact', 'Le formulaire de commande'],
      [/propos|over-ons|about/, '#atelier', 'L’atelier de Sophie'],
      [/realisation|realisatie|galerie/, '#atelier', 'L’atelier et ses compositions'],
      [/confidentialit|privacy|rgpd|cookie/, '', 'La politique de confidentialité', '/confidentialite.html'],
      [/cgu|mention|condition|legal/, '', 'Les conditions et mentions légales', '/cgu.html'],
      [/fleuriste|bloemist|ixelles|elsene|bruxelles|brussel|dimanche/, '', 'L’accueil de Rose Noire']
    ];
    const hit = guesses.find((g) => g[0].test(path));
    const box = $('[data-guess]');
    if (hit && box) {
      const a = $('a', box);
      a.href = BASE + (hit[3] || '/') + (hit[1] || '');
      $('[data-guess-label]', box).textContent = hit[2];
      box.hidden = false;
    }
  });

  d.classList.add('js-ready');
  requestTick();
})();
