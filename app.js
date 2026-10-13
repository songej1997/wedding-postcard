/* =====================================================================
 * app.js — 화면 동작. 문구/날짜/장소/사진 경로는 invitation-data.js 에서만 바꿉니다.
 * ===================================================================== */
(function () {
  'use strict';
  var D = window.INVITATION;
  var doc = document;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ua = navigator.userAgent || '';
  
  function get(obj, path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj); }
  function safeStore(op, k, v) {
    try { return op === 'get' ? localStorage.getItem(k) : (op === 'set' ? localStorage.setItem(k, v) : localStorage.removeItem(k)); }
    catch (e) { return null; }
  }
  /* 사용자 입력은 항상 textContent 로만 화면에 넣습니다(XSS 방지). 제어문자·꺾쇠 제거 + 길이 제한 */
  function clean(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max || 40); }

  /* ── 데이터 → 화면 ─────────────────────────────── */
  doc.title = D.meta.title;
  $$('[data-bind]').forEach(function (el) {
    var v = get(D, el.getAttribute('data-bind'));
    el.textContent = v == null ? '' : v;
  });
  if (!D.meta.credit) { var cr = $('.credit'); if (cr) cr.hidden = true; }

  /* ── 지도 링크 ─────────────────────────────────── */
  var V = D.venue;
  var q = encodeURIComponent(V.mapQuery);
  var hasXY = typeof V.lat === 'number' && typeof V.lng === 'number';
  var naverUrl = V.mapLinks.naver || ('https://map.naver.com/p/search/' + q);
  var kakaoUrl = V.mapLinks.kakao || (hasXY
    ? 'https://map.kakao.com/link/map/' + encodeURIComponent(V.name) + ',' + V.lat + ',' + V.lng
    : 'https://map.kakao.com/link/search/' + q);
  $('#btnNaver').href = naverUrl;
  $('#btnKakao').href = kakaoUrl;
  $('#venueLink').href = naverUrl;
  $('#callLink').href = 'tel:' + V.phone.replace(/[^0-9+]/g, '');
  $('#mapImg').src = V.directionsImage;
  $('#hallImg').src = V.hallImage;

  /* ── 토스트 / 복사 ─────────────────────────────── */
  var toastEl = $('#toast'), toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }
  function copyText(text, okMsg) {
    function fallback() {
      var ta = doc.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; doc.body.appendChild(ta); ta.select();
      var ok = false; try { ok = doc.execCommand('copy'); } catch (e) {}
      doc.body.removeChild(ta); toast(ok ? (okMsg || '복사했어요') : '복사하지 못했어요. 길게 눌러 직접 복사해 주세요');
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg || '복사했어요'); }, fallback);
    } else fallback();
  }
  $('#copyAddr').addEventListener('click', function () { copyText(V.address, '주소를 복사했어요'); });

  /* ── 종이 가장자리(찢긴 느낌) ───────────────────── */
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function deckle(el, seed) {
    var w = el.offsetWidth || 300, h = el.offsetHeight || 200;
    var ax = Math.min(1.4, 2.6 / w * 100), ay = Math.min(1.4, 2.6 / h * 100);
    var r = rng(seed), n = Math.max(10, Math.round(w / 22)), m = Math.max(8, Math.round(h / 22)), p = [], i;
    for (i = 0; i <= n; i++) p.push([i / n * 100, r() * ay]);
    for (i = 1; i <= m; i++) p.push([100 - r() * ax, i / m * 100]);
    for (i = n - 1; i >= 0; i--) p.push([i / n * 100, 100 - r() * ay]);
    for (i = m - 1; i > 0; i--) p.push([r() * ax, i / m * 100]);
    el.style.clipPath = 'polygon(' + p.map(function (a) { return a[0].toFixed(2) + '% ' + a[1].toFixed(2) + '%'; }).join(',') + ')';
  }
  function applyDeckle() { $$('[data-deckle]').forEach(function (el, i) { if (el.offsetWidth) deckle(el, 7 + i * 13); }); }

  /* ── 사진(없으면 빈 사진) ───────────────────────── */
  function photoEl(src, alt) {
    var d = doc.createElement('div'); d.className = 'photo';
    if (src) {
      var im = new Image(); im.alt = alt || ''; im.decoding = 'async'; im.loading = 'lazy';
      im.onerror = function () { d.classList.add('is-blank'); if (im.parentNode) im.parentNode.removeChild(im); };
      im.src = src; d.appendChild(im);
    } else d.classList.add('is-blank');
    if (!src) d.setAttribute('role', 'img'), d.setAttribute('aria-label', (alt || '사진') + ' (사진 준비 중)');
    return d;
  }

  /* ── 모달 공통(포커스 가두기·Esc·스크롤 잠금) ───── */
  var openModalEl = null, lastFocus = null;
  function focusables(root) { return $$('button,[href],input,textarea,[tabindex]:not([tabindex="-1"])', root).filter(function (e) { return !e.disabled && e.offsetParent !== null; }); }
  function openModal(el, trigger, focusSel) {
    lastFocus = trigger || doc.activeElement; openModalEl = el;
    el.hidden = false; doc.documentElement.classList.add('lock'); doc.body.classList.add('lock');
    applyDeckle();
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('in'); }); });
    var f = (focusSel && $(focusSel, el)) || focusables(el)[0]; if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 30);
  }
  function closeModal() {
    var el = openModalEl; if (!el) return; openModalEl = null;
    el.classList.remove('in');
    setTimeout(function () { el.hidden = true; if (!openModalEl) { doc.documentElement.classList.remove('lock'); doc.body.classList.remove('lock'); } }, reduce ? 0 : 320);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  doc.addEventListener('keydown', function (e) {
    if (!openModalEl) return;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
    if (openModalEl.id === 'noteModal') {
      if (e.key === 'ArrowRight') { e.preventDefault(); showNote(noteIdx + 1, false, 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); showNote(noteIdx - 1, false, -1); }
    }
    if (e.key === 'Tab') {
      var f = focusables(openModalEl); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  $$('.modal').forEach(function (m) { m.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeModal(); }); });

  /* ── 3. NOTES FROM US: 사진 N장을 하트 곡선 위에 배치 + 확대 모달(좌우 넘기기) ── */
  var notes = D.photos.notes, noteIdx = 0;
  var pile = $('#pile');
  (function layoutHeart() {
    var N = notes.length, pts = [], S = 600, i, t, x, y, px, py, len = [0];
    function H(t) { return [16 * Math.pow(Math.sin(t), 3), 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]; }
    for (i = 0; i <= S; i++) {                              // 하트 곡선을 촘촘히 샘플링해 '호 길이'로 균등 분할
      t = i / S * 2 * Math.PI; var p = H(t); pts.push(p);
      if (i) len.push(len[i - 1] + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]));
    }
    var total = len[S];
    /* 사진이 정확히 10장이면 하트 모양(위 2 · 4 · 3 · 1 줄)으로 촘촘히 쌓고, 그 외 장수는 하트 곡선 위에 균등 배치 */
    var GRID = [[26,17],[74,17],[14,37],[38,37],[62,37],[86,37],[26,57],[50,57],[74,57],[50,78]];
    notes.forEach(function (n, k) {
      var left, top;
      if (N === 10) { left = GRID[k][0]; top = GRID[k][1]; }
      else {
        var target = (k + 0.5) / N * total, j = 0; while (len[j] < target) j++;
        var p = pts[j]; left = 50 + p[0] / 16 * 36; top = 17 + (12 - p[1]) / 29 * 66;
      }
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'polaroid tile';
      b.style.cssText = 'left:' + left.toFixed(2) + '%;top:' + top.toFixed(2) + '%;--r:' + (((k * 37) % 13) - 6) + 'deg;--i:' + k + ';z-index:' + (k % 2 ? 2 : 1);
      b.setAttribute('aria-label', '사진 ' + (k + 1) + ' / ' + N + ' 크게 보기');
      b.appendChild(photoEl(n.src, n.alt));
      b.addEventListener('click', function () { showNote(k, true); openModal($('#noteModal'), b, '#noteNext'); });
      pile.appendChild(b);
    });
  })();
  function showNote(i, instant, dir) {
    noteIdx = (i + notes.length) % notes.length;
    var n = notes[noteIdx], big = $('#bigPolaroid'), memo = $('#memo');
    big.replaceChildren(photoEl(n.src, n.alt));
    $('#memoText').textContent = n.memo || ''; memo.hidden = !n.memo;
    $('#noteCount').textContent = (noteIdx + 1) + ' / ' + notes.length;
    if (!instant && !reduce) {
      big.style.setProperty('--dx', (dir || 1) * 34 + 'px');
      [big, memo].forEach(function (el) { el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap'); });
    }
  }
  $('#notePrev').addEventListener('click', function () { showNote(noteIdx - 1, false, -1); });
  $('#noteNext').addEventListener('click', function () { showNote(noteIdx + 1, false, 1); });
  showNote(0, true);
  (function swipe() {                                    // 좌우 스와이프로 사진 전환
    var sx = null, sy = null, sheet = $('#noteSheet');
    sheet.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    sheet.addEventListener('touchend', function (e) {
      if (sx == null) return; var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) showNote(noteIdx + (dx < 0 ? 1 : -1), false, dx < 0 ? 1 : -1);
    }, { passive: true });
  })();

  /* ── 약도 확대 ─────────────────────────────────── */
  $('#mapOpen').addEventListener('click', function (e) {
    $('#mapBig').src = V.directionsImage; openModal($('#mapModal'), e.currentTarget, '#mapClose');
  });

  /* ── 2. A LETTER FOR YOU ───────────────────────── */
  var L = D.letter;
  (function () { var lb = $('#letterBody'); L.body.forEach(function (t) { var p = doc.createElement('p'); if (t) p.textContent = t; else p.className = 'gap'; lb.appendChild(p); }); })();
  var guest = clean(new URLSearchParams(location.search).get('to'), L.maxNameLength);
  var guestEl = $('#guestName');
  function setGuest(n) { guest = n; guestEl.textContent = n || L.defaultName; }
  setGuest(guest);
  if (!guest) {
    var nf = $('#nameForm'), ni = $('#nameInput'); nf.hidden = false;
    nf.addEventListener('submit', function (e) { e.preventDefault(); setGuest(clean(ni.value, L.maxNameLength)); toast('편지에 이름을 적었어요'); });
  }
  var stage = $('#stage'), seal = $('#seal'), timers = [];
  function later(ms, fn) { timers.push(setTimeout(fn, reduce ? 0 : ms)); }
  function centerCard() {                                // 편지가 다 열리면 화면 한가운데에 오도록 부드럽게 스크롤
    var top = window.pageYOffset + stage.getBoundingClientRect().top;
    var cardCenter = top + 570 - (14 + 106 + 205);       // 최종 높이 기준 편지 카드의 중심
    window.scrollTo({ top: Math.max(0, cardCenter - window.innerHeight / 2), behavior: reduce ? 'auto' : 'smooth' });
  }
  function openEnvelope() {
    if (stage.dataset.state !== 'closed') return;
    seal.setAttribute('aria-expanded', 'true'); seal.setAttribute('aria-label', '편지봉투 열림');
    $('#tapHint').style.opacity = 0; $('#tapHint').disabled = true;
    stage.classList.add('pressed');                      // 0) 도장을 눌렀을 때 살짝 눌림
    later(150, function () { stage.dataset.state = 'flap'; });    // 1) 덮개가 3D 로 젖혀진다
    later(950, function () { stage.dataset.state = 'rise'; });    // 2) 엽서가 봉투 속에서 위로 올라온다
    later(2300, function () { stage.dataset.state = 'unfold'; centerCard(); }); // 3) 엽서가 펼쳐지며 중앙에 안착
    later(3900, function () { stage.dataset.state = 'open'; });
  }
  $('#tapHint').addEventListener('click', openEnvelope);
  seal.addEventListener('click', openEnvelope);
  $('#stage').addEventListener('click', function (e) { if (e.target.closest('.env-wrap') && !e.target.closest('.letter-card')) openEnvelope(); });

  /* ── 연락처 · 혼주 연락 ─────────────────────────── */
  function digits(p) { return String(p || '').replace(/[^0-9+]/g, ''); }
  function noPhone() { toast('전화번호가 아직 등록되지 않았어요'); }
  $$('[data-call]').forEach(function (b) {
    b.addEventListener('click', function () {
      var n = digits(D.contacts[b.getAttribute('data-call')].phone);
      if (!n) return noPhone();
      location.href = 'tel:' + n;
    });
  });
  var cols = $('#hostCols');
  [['groom', '신랑측'], ['bride', '신부측']].forEach(function (g) {
    var col = doc.createElement('div'); col.className = 'host-col';
    var h = doc.createElement('h4'); h.textContent = g[1]; col.appendChild(h);
    D.contacts.hosts[g[0]].forEach(function (p) {
      var box = doc.createElement('div'); box.className = 'host-person';
      var nm = doc.createElement('p'); nm.textContent = p.role + ' ' + p.name; box.appendChild(nm);
      var act = doc.createElement('div'); act.className = 'host-act';
      [['tel:', '#i-phone', '전화'], ['sms:', '#i-sms', '문자']].forEach(function (k) {
        var a = doc.createElement('a'); a.setAttribute('aria-label', p.role + ' ' + p.name + ' ' + k[2]);
        var n = digits(p.phone); a.href = n ? k[0] + n : '#';
        if (!n) a.addEventListener('click', function (e) { e.preventDefault(); noPhone(); });
        a.innerHTML = '<svg aria-hidden="true"><use href="' + k[1] + '"/></svg>'; act.appendChild(a);
      });
      box.appendChild(act); col.appendChild(box);
    });
    cols.appendChild(col);
  });
  $('#hostOpen').addEventListener('click', function (e) { openModal($('#hostModal'), e.currentTarget, '#hostClose'); });

  /* ── 마음 전하실 곳(아코디언 + 복사) ──────────────── */
  var accList = $('#accList');
  [['groom', '신랑측 마음 전하기'], ['bride', '신부측 마음 전하기']].forEach(function (g, gi) {
    var item = doc.createElement('div'); item.className = 'acc__item';
    var id = 'acc-' + g[0];
    var head = doc.createElement('button'); head.type = 'button'; head.className = 'acc__head';
    head.setAttribute('aria-expanded', 'false'); head.setAttribute('aria-controls', id);
    head.innerHTML = '<span></span><svg aria-hidden="true"><use href="#i-down"/></svg>'; head.firstChild.textContent = g[1];
    var body = doc.createElement('div'); body.className = 'acc__body'; body.id = id; body.setAttribute('role', 'region');
    var wrap = doc.createElement('div'), inner = doc.createElement('div'); inner.className = 'acc__inner';
    D.accounts[g[0]].forEach(function (a) {
      var row = doc.createElement('div'); row.className = 'acc__row';
      var t = doc.createElement('div');
      var w = doc.createElement('p'); w.className = 'acc__who'; w.textContent = a.role + ' ' + a.name;
      var n = doc.createElement('p'); n.className = 'acc__num'; n.textContent = a.bank + ' ' + a.number;
      t.appendChild(w); t.appendChild(n);
      var c = doc.createElement('button'); c.type = 'button'; c.className = 'acc__copy'; c.setAttribute('aria-label', a.role + ' ' + a.name + ' 계좌번호 복사');
      c.innerHTML = '<svg aria-hidden="true"><use href="#i-copy"/></svg>';
      c.addEventListener('click', function () {
        copyText(a.number, '계좌번호가 복사되었어요'); c.classList.add('is-copied'); setTimeout(function () { c.classList.remove('is-copied'); }, 1600);
      });
      row.appendChild(t); row.appendChild(c); inner.appendChild(row);
    });
    wrap.appendChild(inner); body.appendChild(wrap);
    head.addEventListener('click', function () {
      var open = item.classList.toggle('is-open'); head.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    item.appendChild(head); item.appendChild(body); accList.appendChild(item);
  });

  /* ── D-DAY (맨 마지막) ───────────────────────────── */
  var target = new Date(D.event.dateISO).getTime();
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var diff = target - Date.now(), dd = $('#ddD'), hh = $('#ddH'), mm = $('#ddM'), ss = $('#ddS'), cap = $('#ddCap');
    if (diff <= 0) { dd.textContent = hh.textContent = mm.textContent = ss.textContent = '00'; cap.textContent = D.ending.ddayDone; return; }
    var d = Math.floor(diff / 864e5); diff -= d * 864e5;
    var h = Math.floor(diff / 36e5); diff -= h * 36e5;
    var m = Math.floor(diff / 6e4); diff -= m * 6e4;
    dd.textContent = pad(d); hh.textContent = pad(h); mm.textContent = pad(m); ss.textContent = pad(Math.floor(diff / 1000));
    cap.textContent = D.couple.short.replace(' & ', ', ') + '의 결혼식이 ' + d + '일 남았습니다.';
  }
  tick(); setInterval(function () { if (!doc.hidden) tick(); }, 1000);

  /* ── 스크롤 등장 · 오프닝 ───────────────────────── */
  var opening = $('#openingInner');
  function revealAll() { $$('.rv').forEach(function (e) { e.classList.add('in'); }); }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.rv').forEach(function (e) { io.observe(e); });
  } else revealAll();
  function start() { applyDeckle(); requestAnimationFrame(function () { opening.classList.add('in'); }); }
  if (doc.fonts && doc.fonts.ready) { doc.fonts.ready.then(applyDeckle); }
  window.addEventListener('load', applyDeckle);
  var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(applyDeckle, 150); });
  start();
})();
