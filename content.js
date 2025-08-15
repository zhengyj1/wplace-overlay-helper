
// WPlace Overlay Helper - Stable content script (based on v2.1.1 behavior)
(() => {
  const STATE_KEY = "wpo_state::" + location.origin;
  let overlay=null, img=null, panel=null;
  let tx=innerWidth/2, ty=innerHeight/2, scale=1, opacity=.4;
  let dragging=false, sx=0, sy=0, bx=0, by=0, edit=false;
  let naturalW=0, naturalH=0, visible=false;

  function save(){
    const data={tx,ty,scale,opacity,visible, src: img? img.src : null};
    chrome.storage.local.set({[STATE_KEY]:data});
  }
  function load(){
    return new Promise(r=>{
      chrome.storage.local.get(STATE_KEY, res=>{
        const st=res[STATE_KEY];
        if(st){
          tx=st.tx??tx; ty=st.ty??ty; scale=st.scale??scale; opacity=st.opacity??opacity; visible=st.visible??false;
          if(st.src && img) img.src=st.src;
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
    panel?.querySelector("#wpo-scale")?.replaceChildren(document.createTextNode(scale.toFixed(2)+"x"));
    panel?.querySelector("#wpo-op")?.replaceChildren(document.createTextNode(opacity.toFixed(2)));
    const r=panel?.querySelector("#wpo-op-range"); if(r) r.value=String(opacity);
    save();
  }
  function setSrc(src){
    if(!src) return;
    img.onload=()=>{ naturalW=img.naturalWidth||img.width; naturalH=img.naturalHeight||img.height; apply(); };
    img.onerror=()=>console.warn("[WPO] image load failed");
    img.src=src;
  }
  function fitW(){ if(naturalW){ scale=innerWidth/naturalW; apply(); } }
  function fitH(){ if(naturalH){ scale=innerHeight/naturalH; apply(); } }
  function reset(){ tx=innerWidth/2; ty=innerHeight/2; scale=1; opacity=.4; apply(); }

  function ensure(){
    if(overlay) return;
    overlay=document.createElement("div");
    Object.assign(overlay.style,{position:"fixed",inset:"0",zIndex:"999999",pointerEvents:"none"});
    overlay.id="__wpo_overlay";
    document.documentElement.appendChild(overlay);

    img=document.createElement("img");
    Object.assign(img.style,{position:"absolute",transformOrigin:"center center",willChange:"transform,opacity",userSelect:"none",WebkitUserDrag:"none"});
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
          <span class="wpo-badge">Alt=编辑 | 拖/滚轮/粘贴/拖图</span>
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
          <div><span class="wpo-k">Alt</span> + 拖动：移动 | <span class="wpo-k">Alt</span> + 滚轮：缩放（配合 Ctrl/⌘ 更细）</div>
          <div><span class="wpo-k">Alt</span> + [ / ]：透明度 − / ＋ | <span class="wpo-k">Alt</span> + 1..9：设为 0.1..0.9</div>
          <div><span class="wpo-k">Alt</span> + W/H：适配宽/高 | <span class="wpo-k">Alt</span> + 0：重置 | <span class="wpo-k">Alt</span> + X：显隐 | <span class="wpo-k">Alt</span> + Delete：移除</div>
          <div class="wpo-free">本扩展免费提供</div>
          <div class="wpo-author">Created By Zhengyj</div>
        </div>
      </div>
    `;
    overlay.appendChild(panel);

    // Hidden input for in-page Load (备用)
    const fileInput=document.createElement('input');
    fileInput.type='file'; fileInput.accept='image/*'; fileInput.style.display='none';
    document.documentElement.appendChild(fileInput);
    fileInput.addEventListener('change',()=>{
      const f=fileInput.files&&fileInput.files[0]; if(!f) return;
      const r=new FileReader(); r.onload=()=>setSrc(r.result); r.readAsDataURL(f); fileInput.value='';
    });

    // Panel interactions
    panel.addEventListener('pointerdown', e=>{ if(!edit) return; panel.style.pointerEvents='auto'; setTimeout(()=>panel.style.pointerEvents='none',0); });
    const $url=panel.querySelector('#wpo-url');
    panel.querySelector('#wpo-set-url').onclick=()=>{ if(edit){ const v=$url.value.trim(); if(v) setSrc(v);} };
    panel.querySelector('#wpo-op-range').addEventListener('input',e=>{ opacity=Math.min(1,Math.max(0,parseFloat(e.target.value))); apply(); });
    panel.querySelector('#wpo-fit-w').onclick=()=>{ if(edit) fitW(); };
    panel.querySelector('#wpo-fit-h').onclick=()=>{ if(edit) fitH(); };
    panel.querySelector('#wpo-reset').onclick=()=>{ if(edit) reset(); };
    panel.querySelector('#wpo-hide').onclick=()=>{ if(edit) img.style.display=(img.style.display==='none')?'':''; };
    panel.querySelector('#wpo-remove').onclick=()=>{ if(edit) { if(overlay&&overlay.parentNode) overlay.parentNode.removeChild(overlay); overlay=null; img=null; panel=null; visible=false; save(); } };

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

    // Paste
    addEventListener('paste', e=>{
      const items=e.clipboardData&&e.clipboardData.items; if(!items) return;
      for(const it of items){ if(it.type?.startsWith('image/')){ const f=it.getAsFile(); if(f) handleFiles([f]); break; } }
    });

    // Move & scale & keys
    addEventListener('pointerdown', e=>{ if(!e.altKey) return; edit=true; dragging=true; sx=e.clientX; sy=e.clientY; bx=tx; by=ty; e.preventDefault(); }, {capture:true});
    addEventListener('pointermove', e=>{ if(!dragging) return; const dx=e.clientX-sx, dy=e.clientY-sy; tx=bx+dx; ty=by+dy; apply(); }, {capture:true});
    addEventListener('pointerup', ()=>{ dragging=false; }, {capture:true});
    addEventListener('wheel', e=>{ if(!e.altKey) return; edit=true; const factor=e.deltaY<0?1.05:0.95; const mul=(e.ctrlKey||e.metaKey)?Math.pow(factor,.2):factor; scale=Math.max(.05,Math.min(100,scale*mul)); apply(); e.preventDefault(); }, {passive:false});
    addEventListener('keydown', e=>{
      if(!e.altKey) return; edit=true; const k=e.key.toLowerCase();
      if(k==='['){ opacity=Math.max(0,opacity-.05); apply(); }
      else if(k===']'){ opacity=Math.min(1,opacity+.05); apply(); }
      else if(k==='w'){ fitW(); }
      else if(k==='h'){ fitH(); }
      else if(k==='0'){ reset(); }
      else if(k==='x'){ img.style.display=(img.style.display==='none')?'':''; }
      else if(k>='1'&&k<='9'){ opacity=(k.charCodeAt(0)-48)/10; apply(); }
      else if(k==='backspace'||k==='delete'){ if(overlay&&overlay.parentNode) overlay.parentNode.removeChild(overlay); overlay=null; img=null; panel=null; visible=false; save(); }
    });
    addEventListener('resize', ()=>{ tx=Math.min(Math.max(0,tx),innerWidth); ty=Math.min(Math.max(0,ty),innerHeight); apply(); });
    addEventListener('keyup', e=>{ if(e.key==='Alt') edit=false; });
  }

  function show(){ ensure(); overlay.style.display=''; visible=true; save(); }
  function hide(){ if(!overlay) return; overlay.style.display='none'; visible=false; save(); }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse)=>{
    if(!msg||!msg.type) return;
    switch(msg.type){
      case 'wpo_create_or_show': show(); sendResponse({ok:true}); break;
      case 'wpo_hide': hide(); sendResponse({ok:true}); break;
      case 'wpo_remove': if(overlay&&overlay.parentNode) overlay.parentNode.removeChild(overlay); overlay=null; img=null; panel=null; visible=false; save(); sendResponse({ok:true}); break;
      case 'wpo_set_url': ensure(); setSrc(msg.url); show(); sendResponse({ok:true}); break;
      case 'wpo_set_opacity': ensure(); opacity=Math.min(1,Math.max(0,Number(msg.opacity))); apply(); sendResponse({ok:true}); break;
      case 'wpo_fit': ensure(); (msg.mode==='width'?fitW:fitH)(); sendResponse({ok:true}); break;
      case 'wpo_reset': ensure(); reset(); sendResponse({ok:true}); break;
      case 'wpo_set_data_url': ensure(); setSrc(msg.dataUrl); show(); sendResponse({ok:true}); break;
      default: break;
    }
    return true;
  });

  (async()=>{
    ensure(); hide();
    await load(); apply();
    if(visible) show();
    console.debug('[WPO] ready on', location.origin);
  })();
})();
