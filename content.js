
// WPlace Overlay Helper - 2.2.0 (stabilized, scale 0–20x)
(() => {
  'use strict';
  const STATE_KEY = "wpo_state::" + location.origin;
  let overlay=null, img=null, panel=null;
  let tx=innerWidth/2, ty=innerHeight/2, scale=1, opacity=.4, panelVisible=true;
  let dragging=false, sx=0, sy=0, bx=0, by=0, edit=false;
  let naturalW=0, naturalH=0, visible=false;
  let saveTimer = null;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  function saveNow(){
    try {
      const data={tx,ty,scale,opacity,visible,panelVisible, src: (img && img.src && !img.src.startsWith('blob:')) ? img.src : null};
      chrome.storage.local.set({[STATE_KEY]:data});
    } catch(e){ /* ignore */ }
  }
  function saveDeferred(){
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 200); // throttle writes to avoid jank
  }
  function load(){
    return new Promise(r=>{
      chrome.storage.local.get(STATE_KEY,res=>{
        const st=res?.[STATE_KEY];
        if(st){
          tx=st.tx??tx; ty=st.ty??ty; scale=st.scale??scale; opacity=st.opacity??opacity;
          visible=st.visible??false; panelVisible = st.panelVisible ?? true;
        }
        r();
      });
    });
  }

  function apply(){
    if(!img) return;
    img.style.opacity=String(opacity);
    img.style.left=tx+"px"; img.style.top=ty+"px";
    img.style.transform=`translate(-50%,-50%) scale(${scale})`;
    const $s=panel?.querySelector("#wpo-scale"); if($s) $s.textContent = scale.toFixed(2)+"x";
    const $o=panel?.querySelector("#wpo-op"); if($o) $o.textContent = opacity.toFixed(2);
    const $or=panel?.querySelector("#wpo-op-range"); if($or) $or.value=String(opacity);
    saveDeferred();
  }
  function setSrc(src){
    if(!src) return;
    img.onload=()=>{ naturalW=img.naturalWidth||img.width; naturalH=img.naturalHeight||img.height; apply(); };
    img.onerror=()=>console.warn("[WPO] image load failed");
    img.src=src;
  }
  function fitW(){ if(naturalW){ scale=innerWidth/naturalW; scale=clamp(scale, 0, 20); apply(); } }
  function fitH(){ if(naturalH){ scale=innerHeight/naturalH; scale=clamp(scale, 0, 20); apply(); } }
  function reset(){ tx=innerWidth/2; ty=innerHeight/2; scale=1; opacity=.4; apply(); }

  function ensure(){
    if(overlay) return;
    overlay=document.createElement("div");
    Object.assign(overlay.style,{position:"fixed",inset:"0",zIndex:"2147483647",pointerEvents:"none"});
    overlay.id="__wpo_overlay";
    document.documentElement.appendChild(overlay);

    img=document.createElement("img");
    Object.assign(img.style,{position:"absolute",transformOrigin:"center center",willChange:"transform,opacity",userSelect:"none",WebkitUserDrag:"none"});
    img.style.imageRendering = "pixelated";
    img.referrerPolicy = "no-referrer";
    img.crossOrigin = "anonymous";
    overlay.appendChild(img);

    panel=document.createElement("div");
    panel.innerHTML=`
      <style>
        .wpo-panel{position:fixed;left:12px;bottom:12px;font:12px/1.4 system-ui;
          background:rgba(0,0,0,.55);color:#fff;padding:8px 10px;border-radius:6px;
          pointer-events:none;backdrop-filter:saturate(1.2) blur(2px);max-width:60vw}
        .wpo-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .wpo-btn{padding:2px 6px;border:1px solid rgba(255,255,255,.3);border-radius:4px;background:transparent;color:#fff;cursor:default}
        .wpo-btn[disabled]{opacity:.4}
        .wpo-k{font-weight:700}
        .wpo-range{width:140px}
        .wpo-hint{opacity:.9;margin-top:4px}
        .wpo-badge{display:inline-block;padding:1px 6px;border:1px solid rgba(255,255,255,.35);border-radius:999px;margin-left:6px}
        .wpo-free{margin-top:6px;text-align:right;opacity:.85}
        .wpo-author{margin-top:2px;text-align:right;opacity:.75}
      </style>
      <div class="wpo-panel">
        <div class="wpo-row">
          <span>Overlay</span>
          <span>scale:<b id="wpo-scale">1.00x</b></span>
          <span>opacity:<b id="wpo-op">0.40</b></span>
          <span class="wpo-badge">Alt=编辑 | 拖/粘贴/拖图</span>
        </div>
        <div class="wpo-row" style="margin-top:4px">
          <input id="wpo-op-range" class="wpo-range" type="range" min="0" max="1" step="0.01" value="0.4">
          <input id="wpo-url" type="text" placeholder="Image URL" style="height:22px;padding:0 6px;border-radius:4px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;">
          <button id="wpo-set-url" class="wpo-btn">Set URL</button>
          <button id="wpo-fit-w" class="wpo-btn">Fit-W</button>
          <button id="wpo-fit-h" class="wpo-btn">Fit-H</button>
          <button id="wpo-reset" class="wpo-btn">Reset</button>
          <button id="wpo-hide"  class="wpo-btn">Hide</button>
          <button id="wpo-remove" class="wpo-btn">Remove</button>
        </div>
        <div class="wpo-hint">
          <div><span class="wpo-k">Alt</span> + 拖动：移动 | <span class="wpo-k">Alt</span> + + / -：缩放</div>
          <div><span class="wpo-k">Alt</span> + [ / ]：透明度 − / ＋ | <span class="wpo-k">Alt</span> + 1..9：设为 0.1..0.9</div>
          <div><span class="wpo-k">Alt</span> + W/H：适配宽/高 | <span class="wpo-k">Alt</span> + 0：重置 | <span class="wpo-k">Alt</span> + X：显隐 | <span class="wpo-k">Alt</span> + Delete：移除</div>
          <div class="wpo-free">本扩展免费提供</div>
          <div class="wpo-author">Created By Zhengyj</div>
        </div>
      </div>
    `;
    overlay.appendChild(panel);
    if (!panelVisible) panel.style.display = "none";

    // Drag & drop
    function handleFiles(files){
      if(!files||!files.length) return;
      const f=files[0]; if(!f.type||!f.type.startsWith('image/')) return;
      const r=new FileReader(); r.onload=()=>setSrc(r.result); r.readAsDataURL(f);
    }
    addEventListener('dragover', e=>{ e.preventDefault(); }, {passive:false});
    addEventListener('drop', e=>{
      e.preventDefault();
      if(e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
      else if(e.dataTransfer?.items){ const it=[...e.dataTransfer.items].find(i=>i.kind==='file'); if(it){ const f=it.getAsFile(); if(f) handleFiles([f]); } }
    });
    addEventListener('paste', e=>{
      const items=e.clipboardData&&e.clipboardData.items; if(!items) return;
      for(const it of items){ if(it.type?.startsWith('image/')){ const f=it.getAsFile(); if(f) handleFiles([f]); break; } }
    });

    // Move & scale & keys
    addEventListener('pointerdown', e=>{ if(!e.altKey) return; edit=true; dragging=true; sx=e.clientX; sy=e.clientY; bx=tx; by=ty; e.preventDefault(); }, {capture:true});
    addEventListener('pointermove', e=>{ if(!dragging) return; const dx=e.clientX-sx, dy=e.clientY-sy; tx=bx+dx; ty=by+dy; apply(); }, {capture:true});
    addEventListener('pointerup', ()=>{ dragging=false; }, {capture:true});

    // Keyboard scale: ONLY Alt + +/-
    addEventListener('keydown', e=>{
      if(!e.altKey) return;
      edit = true;
      const k = e.key;
      let handled = false;
      const stepUp = () => { scale = clamp(scale * 1.05, 0, 20); handled = true; };
      const stepDown = () => { scale = clamp(scale * 0.95, 0, 20); handled = true; };
      if (k === '+' || k === 'Add' || k === 'NumpadAdd' || (k === '=' && e.shiftKey)) stepUp();
      else if (k === '-' || k === 'Subtract' || k === 'NumpadSubtract') stepDown();
      else if (k === '[') { opacity = clamp(opacity - 0.05, 0, 1); handled = true; }
      else if (k === ']') { opacity = clamp(opacity + 0.05, 0, 1); handled = true; }
      else if (k === 'w') { fitW(); handled=true; }
      else if (k === 'h') { fitH(); handled=true; }
      else if (k === '0') { reset(); handled=true; }
      else if (k === 'x') { img.style.display=(img.style.display==='none')?'':''; handled=true; }
      else if (k >= '1' && k <= '9') { opacity = clamp((k.charCodeAt(0)-48)/10, 0, 1); handled=true; }
      else if (k === 'Backspace' || k === 'Delete') { if(overlay&&overlay.parentNode) overlay.parentNode.removeChild(overlay); overlay=null; img=null; panel=null; visible=false; saveNow(); handled=true; }
      if (handled){ apply(); e.preventDefault(); }
    });
    addEventListener('resize', ()=>{ tx=Math.min(Math.max(0,tx),innerWidth); ty=Math.min(Math.max(0,ty),innerHeight); apply(); });
    addEventListener('keyup', e=>{ if(e.key==='Alt') edit=false; });
  }

  function show(){ ensure(); overlay.style.display=''; visible=true; saveNow(); if (panel) panel.style.display = panelVisible ? '' : 'none'; }
  function hide(){ if(!overlay) return; overlay.style.display='none'; visible=false; saveNow(); }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse)=>{
    if(!msg||!msg.type) return;
    switch(msg.type){
      case 'wpo_ping': sendResponse({ok:true, ready:true}); break;
      case 'wpo_create_or_show': show(); sendResponse({ok:true}); break;
      case 'wpo_hide': hide(); sendResponse({ok:true}); break;
      case 'wpo_remove': if(overlay&&overlay.parentNode) overlay.parentNode.removeChild(overlay); overlay=null; img=null; panel=null; visible=false; saveNow(); sendResponse({ok:true}); break;
      case 'wpo_set_url': ensure(); setSrc(msg.url); show(); sendResponse({ok:true}); break;
      case 'wpo_set_opacity': ensure(); opacity=clamp(Number(msg.opacity)||0,0,1); apply(); sendResponse({ok:true}); break;
      case 'wpo_set_scale': ensure(); scale=clamp(Number(msg.scale)||1,0,20); apply(); sendResponse({ok:true}); break;
      case 'wpo_fit': ensure(); (msg.mode==='width'?fitW:fitH)(); sendResponse({ok:true}); break;
      case 'wpo_reset': ensure(); reset(); sendResponse({ok:true}); break;
      case 'wpo_get_state': ensure(); sendResponse({ok:true, scale, opacity, panelVisible, visible}); break;
      case 'wpo_set_panel_visible': ensure(); panelVisible = !!msg.panelVisible; if(panel) panel.style.display = panelVisible ? '' : 'none'; saveNow(); sendResponse({ok:true}); break;
      case 'wpo_set_data_url': ensure(); setSrc(msg.dataUrl); show(); sendResponse({ok:true}); break;
      default: break;
    }
    return true;
  });

  (async()=>{
    try {
      ensure(); hide();
      await load(); apply();
      if (panel) panel.style.display = panelVisible ? '' : 'none';
      if(visible) show();
      console.debug('[WPO] ready on', location.origin);
    } catch(e){
      console.warn('[WPO] init error', e);
    }
  })();
})();
