// Идэвхжүүлэлт, засах, хэвлэх — хамгаалалт
(function(){
  const PKG_KEY = "BELTGEL";
  const PKG_LEVEL = "Бэлтгэл";
  const VALID_HASHES = ["e2410ec5d4894cc4","f78990ab8f579035","75dabf5b199ef794","7a97397faec458f7","26c0caae133ca4e1","3a9babdb0edd6ca1","0170f03e68d2075c","6237ae7e993a70f8","4ff5e1007151c69e","c5ffe174ee54f0bc","2cb471d5309a0e14","0c609917a80b7cca","6c49b60c5f2fea59","58fe2875cc04914b","7ff2e16a45a25b08","d1329fe92c50ea45","8a4fd3eef5c0c9c5","64b4f7a1708e9336","b9930625ef582be0","1cc71f5f5bc4c891","80c89cafe50c0102","b0170a84c32256b7","a16fbc6723ef07e8","b68d3134c4d868b4","41a6484c5dc2c7b0","50d8767e78a4acd6","723cf9c688465e3e","007ff05048e598fb","40d3013cc488f2ff","eb9b191c020d6ab9","50bf53d55bd1583d","b822a48aefff7ade","0e201b4df0518e97","d05210f6631b776f","6cb7d64ceacd975d","91b6e6aea0848b9f","a28475e60d049475","23ead0ebf9b4df82","550b4215ce8a352c","64d80eb284f3ada2","0defa9b558793d46","d58b5c61f1f701f8","b28b701793d8f1cb","adca4a74b7e7e7fe","6e7a4221f5857eee","d4c6cc5086020a8c","927d8440cd88b995","e52ae351217d08c1","f787562f2f7a641f","c6be0963233691c0","02ba75300f29b050","c5f2196a9740d7d4","6c94fcdcb5870910","33e019ba486e4947","a216b266afac0b7c","82f5144e429e35a4","47350eebf88ac74a","83c96b0b55c583bf","10424df6fcd5c4da","fe091776cf4fd16d","ed0f98c2b69c2222","535551b59e5184e0","3c5ce25592435fb0","70b278a0396b0d41","cbc2f9788bae337c","0b307178ad7030ea","b5e342dc214ed1da","d28876bcbfc7ac46","d01af51c3997f8b8","7d7df82159bc9527","dbdcd1c12fac3a4f","447722f92aeba7cf","9a1e0a056a4d7e7a","58f4a895a2e329ac","1665467872fde1b9","8fa8a36a610aca2e","066eaa8a22882b03","3f270f5954a0ce9c","b2c40ebc9b49e188","929f7ff422f1eb80","46e8ed736e96eb9f","775ad9fa466295f8","e3308bad01c06d2f","722bbdb60f3fc54b","0486782498a3ecd3","e6fdd53e2eba5066","eb93d1538b0a12ec","a2ef8bada30682f5","adcfa2ebb214647b","1d55d26b08600d3f","24ce606e2c9c2fa5","3e94d446cac80319","e98ab0ece168d371","711755f6d6848680","7a545d922dc77a90","5dd2fa42aef17c9a","3151836054c39e31","dfdf7342a7e5d765","04fde14083674540","9ac8f92132f7136d"];
  const STORAGE_KEY = 'bulgee_' + PKG_KEY.toLowerCase();
  const ACCENT = "#0ea5e9";
  const ACCENT2 = "#8b5cf6";

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
