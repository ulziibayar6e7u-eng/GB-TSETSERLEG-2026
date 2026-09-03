// Идэвхжүүлэлт, засах, хэвлэх — хамгаалалт
(function(){
  const PKG_KEY = "AHLAH";
  const PKG_LEVEL = "Ахлах";
  const VALID_HASHES = ["63fd56f916007d45","bea4c9cfe68ea2d6","798bffe67a41ca2a","6547bcab8016896e","715580da73ba572d","a838c2f445de875f","c02cd15788b9d633","61bf85073414058b","04cfc97a11cc05fd","2bf8ca3bf5d1b848","b8654e2183d16f8c","bc0eaccf46fce57e","6e6cc7ea1379d6ce","985be69c6724fa22","b513413c8374e372","b658d351956edf07","01aa7bb7241fcf88","c21a2e798f53bd28","5843a06b6d84f508","2d25b7d9677450db","b1160bc0065b2d9a","acb620f352e71f46","4a1346168855a711","72ec7af068f8647e","08d41ada81f1d894","34588184aae6d064","2ed8410400dff1f9","7945e327f7dcf426","5915bfe85d148fb2","eb98ee4786538e0d","63b79703ef99efd2","56c035f64dffd929","e7d0cba62160f9a6","312b417709b4fbd8","d850d205dc9ca120","ede733b7d6dba1d2","b10f00a67db7bccc","96d622a3e9e548c9","d5c394d17c417c2e","bf892a06f94d43fb","13794b9fbc88c551","7a59f9821273deb9","9fdc00419e20b130","0d4f215ee069ca7a","859895bc0edcf35e","d7664fc13d575d91","8934581c4ea9afe2","616ba11e2b0e6d26","158cb109972dbefb","f91fb6f271ff741e","b2fc1d1698c432ef","539aae9e538a19e3","0ffaf1b8361a0028","c64827f6b65a35ce","17159bfe67be870f","82bb4d8851a0abde","fa54d052f292277a","671a8f38bf3e92c5","6d99aec729ecb483","f1f160108c32590a","105393d66fa7e8f9","563082de54270323","030b5333afdbc60e","2b15837fc0b80c7d","9813cace7362eb68","0be08e6e9c7fa06f","a4ad39de3ceaf22e","442b528822bd63b2","c5aa2627d381c7b6","6a8446d9b74156ef","5bafdb4c3f38e01d","0e0ea22b513b7f80","344b8201004c9574","97519500537500d0","5153a7cd31b06668","33586c6c12e3ea8c","1e0d395a574b6bb6","779f4f7c1f897dc4","396c296f26f671b8","68e541b9118d1bbc","030d1377f4c8bfec","2a0b4079dcc5992a","ccfc98acd500e8c4","8b71eeaf1ccab91c","e3f212eac9a6c732","53e8c547e6124d23","a5719f1d59094e70","d1cd1a32a7ebf4b7","41956fe5635e26a0","ff78abfe8bf8ae35","2ce3d91a5014d331","f54008fb958d8cd8","cd948478d867ecea","b45137dad86240d9","1770f1cba9ddd5f1","246b28824650d4aa","c4b5eead336ebbe8","55242832c4c1e68e","1274968e3f0f2150","326b91d2700d5b8e","f93060dd8c505943","f65188719ea7b417"];
  const STORAGE_KEY = 'bulgee_' + PKG_KEY.toLowerCase();
  const ACCENT = "#f59e0b";
  const ACCENT2 = "#ec4899";

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
