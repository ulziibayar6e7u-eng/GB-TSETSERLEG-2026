// Идэвхжүүлэлт, засах, хэвлэх — хамгаалалт
(function(){
  const PKG_KEY = "DUND";
  const PKG_LEVEL = "Дунд";
  const VALID_HASHES = ["d9414a3857e04018","41c3d60136f8e6a5","48b39e78c6466306","d0baa972f14bf22a","f0a7f523a9e67754","2e1a20cdba61c371","f1085c69cb7d5d29","bf767ed90b3697da","cd59ef09f2116b4c","12f3f110fec52e48","aa27cafe344b1566","d402b12e577aff05","75b0124473fa6760","1f7ba61e03d6ebe7","543238709febb506","d4c70efb37df8191","3cc5bb6ddac26be1","966e7def5c10c316","2ce199e441a053bd","de41499e7c8a2f8f","0cb3c4ed67be573e","7901ca8d7e01782e","2a1dcfc8d8f1923a","6ce257950e19e6a8","735c980ec876e970","fc6a0b4cfacf857a","9c3702f8ad3dd636","b8516eab610255d7","2b322a16bb0128d6","66de61877923f56e","91e176fe8ff4f689","9e1421248246e3c7","7af0af273ef67487","5373e5d04b8a3b1c","779681c79557171a","93b418e6b56b6971","26711ee3711900ab","6abfe20eedfd294f","21eded4bb8d0f9ee","16514b64a916cbc9","02f58e133027defe","036e425cb9cd35b1","f25c61ac60246f9f","a4bb13feebf61bad","c1e53510c5d792a6","57b6fb5a02869e76","26b78f8eedc5d254","40699a3fc6042aa0","e61cb7fc93ec364b","a24956560c380339","f4074bc5d1f68ab0","8bb5ad84b4e6ea97","101657b79854e5b4","ae966749d7badc60","d7fcd8194a449472","175f5d2dbf7e51be","6d8cd5674a4d7d7c","7ff79ae6d1f32650","0b590ab32f670b9b","49fdf9e06bcc22da","a886a772da4bb15b","31e727e1a350684a","a14514f037821669","eabf128b26738435","50db61ad9679e992","1efec37e3fdc64f4","b19f60bed070a62a","de0774d271b0325a","21ad301331197f3e","7d9b15365ae008b4","816b3485d40ecdad","d96de91a70b9dd2d","2705690894b0853a","17ad97beadb3d169","12b7256f37813df3","3552b1d58e654463","4cf63eee5d8269bc","11686d287def18e6","f1acf0f932a0c938","8e44015f46e327be","bc12e8bcdc4a771c","da0c9dda67cf16fb","67437e13fa9a354b","8e1b60c3e785a84e","cd88cd7c1a95a667","1efc0e30119e238c","3786b173c25031e9","4e045ffcba57c55b","54b96f7c52bd699d","2f253b252ae424b3","08dd0d5cb93aa3f7","a9170dc953b15c0a","ccaa37728c8efb16","d7dc6482670e3800","0bf6253e9e4da0cf","eef3c06f26fbf13b","3324252bbcf1b1e0","ce8989a179060e07","e5d2a85afc4313f3","d7087d6bcb00eaa7"];
  const STORAGE_KEY = 'bulgee_' + PKG_KEY.toLowerCase();
  const ACCENT = "#8b5cf6";
  const ACCENT2 = "#06b6d4";

  // sha256 in browser
  async function sha256(text) {
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function codeHash(code) {
    const full = await sha256(code + ':salt2026:mn');
    return full.substring(0, 16);
  }

  function getState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
    catch(e) { return null; }
  }
  function setState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // Public API
  window.BulgeeAuth = {
    async check() {
      const s = getState();
      return s && s.activated;
    },
    async activate(code, name, school) {
      code = (code||'').trim().toUpperCase();
      name = (name||'').trim();
      school = (school||'').trim();
      if (!code || !name) return { ok:false, msg:'Код ба нэрээ бүрэн бөглөнө үү' };
      const h = await codeHash(code);
      if (!VALID_HASHES.includes(h)) {
        return { ok:false, msg:'Код буруу байна. Кодоо шалгана уу.' };
      }
      // Check if already used on this browser with different code
      const s = getState();
      if (s && s.code && s.code !== code) {
        return { ok:false, msg:'Энэ хөтөч дээр өөр код идэвхжсэн байна.' };
      }
      setState({
        activated: true,
        code: code,
        name: name,
        school: school,
        activatedAt: new Date().toISOString(),
        pkg: PKG_KEY
      });
      return { ok:true };
    },
    getInfo() {
      return getState() || {};
    },
    logout() {
      if (confirm('Багцаас гарах уу? Дахин активация хийх шаардлагатай.')) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      }
    }
  };

  // Load activation form CSS
  const css = document.createElement('style');
  css.textContent = `
    #actModal { position:fixed; inset:0; background:rgba(0,0,0,.75); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px; font-family:'Segoe UI',Arial,sans-serif; }
    #actBox { background:#fff; padding:36px 42px; border-radius:18px; max-width:480px; width:100%; box-shadow:0 20px 60px rgba(0,0,0,.4); }
    #actBox h2 { background:linear-gradient(135deg,${ACCENT},${ACCENT2}); -webkit-background-clip:text; background-clip:text; color:transparent; font-size:22pt; margin-bottom:8px; }
    #actBox .sub { color:#6b7280; margin-bottom:20px; font-size:11pt; }
    #actBox label { display:block; margin:12px 0 6px; font-weight:600; color:#374151; font-size:11pt; }
    #actBox input { width:100%; padding:12px 14px; border:2px solid #e5e7eb; border-radius:10px; font-size:12pt; font-family:inherit; }
    #actBox input:focus { outline:none; border-color:${ACCENT}; }
    #actBox input[name=code] { font-family:'Consolas',monospace; font-weight:700; text-transform:uppercase; letter-spacing:1px; }
    #actBox button { width:100%; margin-top:20px; padding:14px; background:linear-gradient(135deg,${ACCENT},${ACCENT2}); color:#fff; border:none; border-radius:10px; font-size:12pt; font-weight:700; cursor:pointer; }
    #actBox button:hover { opacity:.9; }
    #actBox .err { color:#dc2626; font-size:10pt; margin-top:8px; text-align:center; min-height:14px; }
    #actBox .hint { background:#fef3c7; padding:12px; border-radius:8px; margin-top:16px; font-size:10pt; color:#78350f; }
    .wm-footer { position:fixed; bottom:8px; right:12px; background:rgba(255,255,255,.9); padding:6px 12px; border-radius:8px; font-size:9pt; color:#6b7280; box-shadow:0 2px 8px rgba(0,0,0,.1); z-index:99; font-family:'Segoe UI',Arial,sans-serif; }
    .wm-footer button { margin-left:8px; padding:3px 8px; border:1px solid #d1d5db; background:#fff; border-radius:5px; cursor:pointer; font-size:9pt; }
    @media print {
      .wm-footer { position:fixed; bottom:5mm; left:0; right:0; text-align:center; background:none; box-shadow:none; font-size:8pt; color:#9ca3af; }
      .wm-footer button, .controls, .no-print { display:none !important; }
      body::before { content: attr(data-wm); position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-30deg); font-size:60pt; color:rgba(0,0,0,.05); font-weight:900; z-index:-1; white-space:nowrap; }
    }
  `;
  document.head.appendChild(css);

  // Gate: show activation modal or footer
  window.BulgeeAuth.check().then(activated => {
    if (!activated) {
      showActivation();
    } else {
      showFooter();
      protectContent();
    }
  });

  function showActivation() {
    // Hide main content but keep modal visible
    const wrap = document.querySelector('.wrap');
    if (wrap) wrap.style.display = 'none';
    const modal = document.createElement('div');
    modal.id = 'actModal';
    modal.style.visibility = 'visible';
    modal.innerHTML = `
      <div id="actBox">
        <h2>🎓 СӨБ бүлэг PRO</h2>
        <div class="sub">${PKG_LEVEL} бүлгийн бэлэн багц · Идэвхжүүлэх код оруулна уу</div>
        <label>Худалдаа авсан код:</label>
        <input name="code" placeholder="${PKG_KEY}-2026-XXXX-XXXX" />
        <label>Багшийн нэр:</label>
        <input name="name" placeholder="Ж.нь: Батсайхан" />
        <label>Цэцэрлэгийн нэр (заавал биш):</label>
        <input name="school" placeholder="Ж.нь: 100-р цэцэрлэг" />
        <div class="err" id="actErr"></div>
        <button id="actBtn">Идэвхжүүлэх</button>
        <div class="hint">💡 Код нь <b>нэг удаа</b> идэвхжинэ. Бусад хөтөч, компьютер дээр ажиллахгүй. Кодоо бусадтай хуваалцах хориотой.</div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#actBtn').onclick = async () => {
      const code = modal.querySelector('[name=code]').value;
      const name = modal.querySelector('[name=name]').value;
      const school = modal.querySelector('[name=school]').value;
      const err = modal.querySelector('#actErr');
      err.textContent = 'Шалгаж байна...';
      const r = await window.BulgeeAuth.activate(code, name, school);
      if (r.ok) {
        err.style.color = '#10b981';
        err.textContent = '✓ Амжилттай! Ачаалж байна...';
        setTimeout(()=>location.reload(), 800);
      } else {
        err.style.color = '#dc2626';
        err.textContent = r.msg;
      }
    };
  }

  function showFooter() {
    const info = window.BulgeeAuth.getInfo();
    const wm = document.createElement('div');
    wm.className = 'wm-footer';
    wm.innerHTML = `
      🔒 <span style="opacity:.65">Хамгаалалттай багц</span>
      <button onclick="window.BulgeeAuth.logout()" title="Гарах">⎋</button>
    `;
    document.body.appendChild(wm);
    document.body.setAttribute('data-wm', `© Г.Өлзийбаяр 2026 · ${info.code}`);
  }

  function protectContent() {
    const info = window.BulgeeAuth.getInfo();

    // 1. 365 хоногийн хугацаа шалгах
    if (info.activatedAt) {
      const days = (Date.now() - new Date(info.activatedAt).getTime()) / 86400000;
      if (days > 365) {
        if (confirm('⏰ Идэвхжүүлэлтийн хугацаа 365+ хоног болсон. Дахин идэвхжүүлэх үү?')) {
          window.BulgeeAuth.logout();
          return;
        }
      }
    }

    // 2. Баруун товч хааж
    document.addEventListener('contextmenu', e => e.preventDefault());

    // 3. Copy — багшийн нэрээр орлуулах
    document.addEventListener('copy', e => {
      const inf = window.BulgeeAuth.getInfo();
      e.clipboardData.setData('text/plain',
        `[© Г.Өлзийбаяр 2026 · Багш: ${inf.name} · Код: ${inf.code}]`);
      e.preventDefault();
    });
    document.addEventListener('cut', e => e.preventDefault());

    // 4. Товчлуурын хамгаалалт
    document.addEventListener('keydown', e => {
      const k = (e.key || '').toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 's') {
        e.preventDefault(); flashMsg('💾 Хадгалахын оронд Word татна уу');
      }
      if ((e.ctrlKey || e.metaKey) && k === 'u') {
        e.preventDefault(); flashMsg('🔒 Эх код харах хориотой');
      }
      if (k === 'f12') {
        e.preventDefault(); flashMsg('🔒 Хамгаалалттай багц');
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) {
        e.preventDefault(); flashMsg('🔒 Хамгаалалттай багц');
      }
    });

    // 5. Tab унтарсан үед blur (privacy)
    let blurStyle = null;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (!blurStyle) {
          blurStyle = document.createElement('style');
          blurStyle.textContent = '.wrap,.doc,main,body>*:not(.wm-footer){filter:blur(20px)!important;transition:filter .3s}';
          document.head.appendChild(blurStyle);
        }
      } else if (blurStyle) {
        blurStyle.remove(); blurStyle = null;
      }
    });

    // 6. iframe хийхээс хамгаалах
    if (window.top !== window.self) {
      document.body.innerHTML = '<div style="padding:60px 20px;text-align:center;font-family:Arial;background:#fee;color:#c00"><h1>⚠ Аюулгүй байдал</h1><p>Энэ багц iframe дотор ачаалагдах хориотой.</p></div>';
    }

    // 7. Flash мессежийн туслах функц
    function flashMsg(txt) {
      const m = document.createElement('div');
      m.textContent = txt;
      m.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:12px 22px;border-radius:12px;font-weight:700;z-index:99999;box-shadow:0 10px 30px rgba(0,0,0,.3);font-family:Segoe UI,Arial,sans-serif;font-size:13px;transition:opacity .4s';
      document.body.appendChild(m);
      setTimeout(() => { m.style.opacity = '0'; }, 2000);
      setTimeout(() => m.remove(), 2500);
    }
  }
})();
