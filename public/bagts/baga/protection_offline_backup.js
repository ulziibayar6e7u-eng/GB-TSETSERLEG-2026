// Идэвхжүүлэлт, засах, хэвлэх — хамгаалалт
(function(){
  const PKG_KEY = "BAGA";
  const PKG_LEVEL = "Бага";
  const VALID_HASHES = ["15ad957a7bab625a","e9ee269a34492850","37f6d4e69e34785a","c8743cd0ba5859f2","5add77624af1e8d7","2fd82bf24f2f86a2","f7166b92b3b5725c","69dd02d38bbcaab8","746eb086163f8828","a32235514306db05","d7b0e245c24b3ec8","e8e6e8a26c3e1616","1794b9d0e56ffa9a","7254d61b043318a3","c1915b4e35615e8e","4104a2ce9bef8318","1538e542bb955716","cc3e20a1fb03e082","5a496db96a96006f","482a6e732866dece","960bc3ce46994a39","5ce6f37893a6bacc","ab21e45d0594ad4d","aae2f4d59566ebf2","6e208fa8818d636e","71faf440c6168ab3","d8e3719e77b67d7e","f0b8e347a733e366","f20bd3e1eafc314f","000a36dde7f8b683","c2f5ed8175911f00","769c1658d892dbd2","b5919feef771c814","16b693a143f6d849","2be8e5b48f388b37","3b6226a3f1e2bde4","11753559bc13248b","191261279b7da946","16cb3f6eee35008e","fc6b5c0f7ab2b8e7","b10f8db182748b40","9906685cc4def10f","509cd8231c6b7b61","80947830b2fe073a","83fc7eac796cd0d9","d69bed399f565b24","56c5fb9b3d5f6855","c175e3010d8ae54a","3fcf8c70f597d6f6","44ed7ef26e3454a9","276f7146f5ed6389","a86b538b1b94fc8c","14e14e661bcd99ab","90a0f1ade4007441","7f99409eb6dae4fa","d42da59acbf4aeab","22e3abf6348ab8b8","430f507806672f20","a6d1ab059440ea40","452169196c872c3d","6454198c428adec1","df6f1de652e1bf07","81cbc86b6365d72b","27e989ef22b25932","ca71a1398b8d90f3","49fcae1738e828a8","daf42fbc820b5878","316ec5f73f8cda9c","d19e29ec0044fe1c","04f235b8636955e4","dc8ce9d9063e43d9","93ae9fe9b4de8deb","f50901082a0e8996","4506cf0780a95e7f","298ecb1e685171ff","fe1ce583446889cc","503b83e646385025","8fd4d03684ca4fdd","3a5e92c6e01ee8ee","39f9af309ccacae2","fb1a5c427eac4a77","6ef7a52d1cff63e7","6b2e88fb3c85be68","14ed999596142f2d","d033e027c98d6201","49e2943cbe722d97","c90d10a6ba15ba5c","5374ec0bd681b097","bb668f982f903ed4","54ee5960a137b5c9","8272ace4a8f3f066","316b6ee806a2e0d3","acfd028cc479b6b7","05434add14084bba","51d9ccf2a68b1263","9e75935a355e1e7d","3bf415015afeec0a","c27cfcc57b513e5f","f08d49496150417f","a98364ba0fbc4cb8"];
  const STORAGE_KEY = 'bulgee_' + PKG_KEY.toLowerCase();
  const ACCENT = "#ec4899";
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
