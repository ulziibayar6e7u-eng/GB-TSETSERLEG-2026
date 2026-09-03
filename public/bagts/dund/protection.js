// СӨБ бүлгийн багш — СЕРВЕРИЙН ЛИЦЕНЗ (Supabase) + хамгаалалт
// Идэвхжүүлэлт онлайнаар шалгагдана · төхөөрөмжийн хязгаар · алсаас хаах
(function(){
  const PKG_KEY   = "DUND";
  const PKG_LEVEL = "Дунд";
  const ACCENT    = "#8b5cf6";
  const ACCENT2   = "#06b6d4";
  const SB_URL    = "https://dehxrmupnbilwlxsovpi.supabase.co";
  const SB_KEY    = "sb_publishable_VRNBeM9nqwFlrDhT2-wD3w_Gp3O85uy";
  const STORAGE_KEY = 'bulgee_' + PKG_KEY.toLowerCase();

  function getState(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'); }catch(e){ return null; } }
  function setState(s){ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
  function deviceId(){
    const s = getState();
    if (s && s.device) return s.device;
    return 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  async function rpc(fn, body){
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), 12000);
    try{
      const r = await fetch(SB_URL + '/rest/v1/rpc/' + fn, {
        method:'POST',
        headers:{ 'apikey':SB_KEY, 'Authorization':'Bearer '+SB_KEY, 'Content-Type':'application/json' },
        body: JSON.stringify(body), signal: ctrl.signal
      });
      clearTimeout(t);
      if (!r.ok) throw new Error('http '+r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  window.BulgeeAuth = {
    // Зөвхөн ОНЛАЙНААР идэвхжсэн (mode+device+code бүхий) төлөвийг зөвшөөрнө.
    // Хуучин офлайн идэвхжүүлэлт → дахин идэвхжүүлнэ.
    async check(){ const s = getState(); return !!(s && s.activated && s.mode==='online' && s.code && s.device); },
    async activate(code, name, school){
      code=(code||'').trim().toUpperCase(); name=(name||'').trim(); school=(school||'').trim();
      if(!code || !name) return { ok:false, msg:'Код ба нэрээ бүрэн бөглөнө үү' };
      const s = getState();
      if(s && s.mode==='online' && s.code && s.code!==code) return { ok:false, msg:'Энэ хөтөч дээр өөр код идэвхжсэн байна.' };
      const dev = deviceId();
      let res;
      try{ res = await rpc('bulgee_activate', { p_code:code, p_device:dev, p_name:name, p_school:school }); }
      catch(e){ return { ok:false, msg:'⚠️ Интернэт холболтоо шалгана уу (идэвхжүүлэхэд онлайн шаардлагатай).' }; }
      if(!res || !res.ok){
        const r = res && res.reason;
        if(r==='notfound') return { ok:false, msg:'Код олдсонгүй. Кодоо шалгана уу.' };
        if(r==='disabled') return { ok:false, msg:'Энэ код хаагдсан байна. Зохиогчтой холбогдоно уу.' };
        if(r==='limit')    return { ok:false, msg:'Энэ код '+(res.max||'')+' төхөөрөмжид аль хэдийн идэвхжсэн. Шинэ төхөөрөмжид ажиллахгүй.' };
        return { ok:false, msg:'Идэвхжүүлэх боломжгүй байна.' };
      }
      setState({ activated:true, mode:'online', code, name, school, device:dev, activatedAt:new Date().toISOString(), pkg:PKG_KEY });
      return { ok:true };
    },
    getInfo(){ return getState() || {}; },
    logout(){
      if(confirm('Багцаас гарах уу? Дахин идэвхжүүлэх шаардлагатай.')){
        localStorage.removeItem(STORAGE_KEY); location.reload();
      }
    }
  };

  // Хэвлэлт/идэвхжүүлэлтийн CSS
  const css=document.createElement('style');
  css.textContent = `
    #actModal{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:'Segoe UI',Arial,sans-serif}
    #actBox{background:#fff;padding:36px 42px;border-radius:18px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.4)}
    #actBox h2{background:linear-gradient(135deg,${ACCENT},${ACCENT2});-webkit-background-clip:text;background-clip:text;color:transparent;font-size:22pt;margin-bottom:8px}
    #actBox .sub{color:#6b7280;margin-bottom:20px;font-size:11pt}
    #actBox label{display:block;margin:12px 0 6px;font-weight:600;color:#374151;font-size:11pt}
    #actBox input{width:100%;padding:12px 14px;border:2px solid #e5e7eb;border-radius:10px;font-size:12pt;font-family:inherit}
    #actBox input:focus{outline:none;border-color:${ACCENT}}
    #actBox input[name=code]{font-family:'Consolas',monospace;font-weight:700;text-transform:uppercase;letter-spacing:1px}
    #actBox button{width:100%;margin-top:20px;padding:14px;background:linear-gradient(135deg,${ACCENT},${ACCENT2});color:#fff;border:none;border-radius:10px;font-size:12pt;font-weight:700;cursor:pointer}
    #actBox button:disabled{opacity:.6;cursor:not-allowed}
    #actBox .err{color:#dc2626;font-size:10pt;margin-top:8px;text-align:center;min-height:14px}
    #actBox .hint{background:#eff6ff;padding:12px;border-radius:8px;margin-top:16px;font-size:10pt;color:#1e3a8a}
    .wm-footer{position:fixed;bottom:8px;right:12px;background:rgba(255,255,255,.9);padding:6px 12px;border-radius:8px;font-size:9pt;color:#6b7280;box-shadow:0 2px 8px rgba(0,0,0,.1);z-index:99;font-family:'Segoe UI',Arial,sans-serif}
    .wm-footer button{margin-left:8px;padding:3px 8px;border:1px solid #d1d5db;background:#fff;border-radius:5px;cursor:pointer;font-size:9pt}
    @media print{
      .wm-footer{position:fixed;bottom:5mm;left:0;right:0;text-align:center;background:none;box-shadow:none;font-size:8pt;color:#9ca3af}
      .wm-footer button,.controls,.no-print{display:none!important}
      body::before{content:attr(data-wm);position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:60pt;color:rgba(0,0,0,.05);font-weight:900;z-index:-1;white-space:nowrap}
    }`;
  document.head.appendChild(css);

  window.BulgeeAuth.check().then(activated=>{
    if(!activated) showActivation();
    else { showFooter(); protectContent(); recheck(); }
  });

  // Алсаас хаасан эсэхийг арын горимд шалгах (офлайн бол алгасна)
  async function recheck(){
    const info = getState(); if(!info || !info.code) return;
    try{
      const res = await rpc('bulgee_check', { p_code:info.code, p_device:info.device });
      if(res && res.ok===false && (res.reason==='disabled' || res.reason==='notfound' || res.status && res.status!=='active')){
        localStorage.removeItem(STORAGE_KEY);
        alert('⚠️ Таны код хаагдсан байна. Зохиогчтой холбогдоно уу.');
        location.reload();
      }
    }catch(e){ /* офлайн — үргэлжлүүлнэ */ }
  }

  function showActivation(){
    const wrap=document.querySelector('.wrap'); if(wrap) wrap.style.display='none';
    const modal=document.createElement('div'); modal.id='actModal';
    modal.innerHTML = `
      <div id="actBox">
        <h2>🎓 СӨБ бүлэг PRO</h2>
        <div class="sub">${PKG_LEVEL} бүлгийн бэлэн багц · Идэвхжүүлэх код оруулна уу</div>
        <label>Худалдаж авсан код:</label>
        <input name="code" placeholder="${PKG_KEY}-2026-XXXX-XXXX" />
        <label>Багшийн нэр:</label>
        <input name="name" placeholder="Ж.нь: Батсайхан" />
        <label>Цэцэрлэгийн нэр (заавал биш):</label>
        <input name="school" placeholder="Ж.нь: 100-р цэцэрлэг" />
        <div class="err" id="actErr"></div>
        <button id="actBtn">Идэвхжүүлэх</button>
        <div class="hint">💡 Идэвхжүүлэхэд <b>интернэт</b> шаардлагатай. Код нь тодорхой тооны төхөөрөмжид л ажиллана. Кодоо бусадтай хуваалцах хориотой.</div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#actBtn').onclick = async ()=>{
      const code=modal.querySelector('[name=code]').value, name=modal.querySelector('[name=name]').value, school=modal.querySelector('[name=school]').value;
      const err=modal.querySelector('#actErr'), btn=modal.querySelector('#actBtn');
      err.style.color='#6b7280'; err.textContent='Шалгаж байна...'; btn.disabled=true;
      const r=await window.BulgeeAuth.activate(code,name,school);
      if(r.ok){ err.style.color='#10b981'; err.textContent='✓ Амжилттай! Ачаалж байна...'; setTimeout(()=>location.reload(),700); }
      else { err.style.color='#dc2626'; err.textContent=r.msg; btn.disabled=false; }
    };
  }

  function showFooter(){
    const info=window.BulgeeAuth.getInfo();
    const wm=document.createElement('div'); wm.className='wm-footer';
    wm.innerHTML = `🔒 <span style="opacity:.65">Хамгаалалттай багц</span> <button onclick="window.BulgeeAuth.logout()" title="Гарах">⎋</button>`;
    document.body.appendChild(wm);
    document.body.setAttribute('data-wm', `© Г.Өлзийбаяр 2026 · ${info.code||''}`);
  }

  function protectContent(){
    const info=window.BulgeeAuth.getInfo();
    document.addEventListener('contextmenu', e=>e.preventDefault());
    document.addEventListener('copy', e=>{ const i=window.BulgeeAuth.getInfo();
      e.clipboardData.setData('text/plain', `[© Г.Өлзийбаяр 2026 · Багш: ${i.name} · Код: ${i.code}]`); e.preventDefault(); });
    document.addEventListener('cut', e=>e.preventDefault());
    document.addEventListener('keydown', e=>{ const k=(e.key||'').toLowerCase();
      if((e.ctrlKey||e.metaKey)&&k==='s'){ e.preventDefault(); flash('💾 Хадгалахын оронд Word татна уу'); }
      if((e.ctrlKey||e.metaKey)&&k==='u'){ e.preventDefault(); flash('🔒 Эх код харах хориотой'); }
      if(k==='f12'){ e.preventDefault(); flash('🔒 Хамгаалалттай багц'); }
      if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(k==='i'||k==='j'||k==='c')){ e.preventDefault(); flash('🔒 Хамгаалалттай багц'); }
    });
    let blurStyle=null;
    document.addEventListener('visibilitychange', ()=>{
      if(document.hidden){ if(!blurStyle){ blurStyle=document.createElement('style');
        blurStyle.textContent='.wrap,.doc,main,body>*:not(.wm-footer){filter:blur(20px)!important;transition:filter .3s}'; document.head.appendChild(blurStyle); } }
      else if(blurStyle){ blurStyle.remove(); blurStyle=null; }
    });
    if(window.top!==window.self){
      document.body.innerHTML='<div style="padding:60px 20px;text-align:center;font-family:Arial;background:#fee;color:#c00"><h1>⚠ Аюулгүй байдал</h1><p>Энэ багц iframe дотор ачаалагдах хориотой.</p></div>';
    }
    function flash(txt){ const m=document.createElement('div'); m.textContent=txt;
      m.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:12px 22px;border-radius:12px;font-weight:700;z-index:99999;box-shadow:0 10px 30px rgba(0,0,0,.3);font-family:Segoe UI,Arial,sans-serif;font-size:13px;transition:opacity .4s';
      document.body.appendChild(m); setTimeout(()=>m.style.opacity='0',2000); setTimeout(()=>m.remove(),2500); }
  }
})();
