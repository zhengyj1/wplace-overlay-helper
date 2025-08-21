
// Popup script - 2.2.0 (stabilized, scale 0–20x)
function activeTab(cb){ chrome.tabs.query({active:true,currentWindow:true}, tabs=>cb(tabs[0])); }
function injectAndRetry(tab, message, cb){
  if (!tab || !tab.id) return;
  chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['content.js']}, () => {
    chrome.tabs.sendMessage(tab.id, message, resp => cb && cb(resp));
  });
}
function send(type, payload={}, cb){
  const message = {type, ...payload};
  activeTab(tab=>{
    if(!tab||!tab.id) return;
    let responded = false;
    const timer = setTimeout(()=>{
      if (responded) return;
      injectAndRetry(tab, message, cb);
    }, 150);
    chrome.tabs.sendMessage(tab.id, message, resp => {
      responded = true;
      clearTimeout(timer);
      if (chrome.runtime.lastError && /Receiving end does not exist/.test(chrome.runtime.lastError.message)){
        injectAndRetry(tab, message, cb);
        return;
      }
      cb && cb(resp);
    });
  });
}

const $ = sel => document.getElementById(sel);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Init from page state
function initFromState(st){
  if(!st) return;
  if (typeof st.scale === 'number'){
    $('scaleRange').value = st.scale.toFixed(2);
    $('scaleInput').value = st.scale.toFixed(2);
  }
  if (typeof st.opacity === 'number'){
    $('opacityRange').value = st.opacity.toFixed(2);
    $('opacityInput').value = st.opacity.toFixed(2);
  }
  $('panelVisible').checked = !!st.panelVisible;
}

// Basic controls
$('btn-show').addEventListener('click', ()=>send('wpo_create_or_show'));
$('btn-hide').addEventListener('click', ()=>send('wpo_hide'));
$('btn-remove').addEventListener('click', ()=>send('wpo_remove'));
$('btn-set-url').addEventListener('click', ()=>{
  const url=$('url').value.trim(); if(!url) return; send('wpo_set_url',{url});
});
$('btn-fitw').addEventListener('click', ()=>send('wpo_fit',{mode:'width'}));
$('btn-fith').addEventListener('click', ()=>send('wpo_fit',{mode:'height'}));
$('btn-reset').addEventListener('click', ()=>send('wpo_reset'));
$('panelVisible').addEventListener('change', e=> send('wpo_set_panel_visible', {panelVisible: e.target.checked}));

// Throttled send via rAF
let rafIdScale = 0, pendingScale = null;
function scheduleScaleSend(v){
  pendingScale = v;
  if (rafIdScale) return;
  rafIdScale = requestAnimationFrame(()=>{
    rafIdScale = 0;
    const val = clamp(parseFloat(pendingScale)||1, 0, 20);
    send('wpo_set_scale', {scale: val});
  });
}

let rafIdOpacity = 0, pendingOpacity = null;
function scheduleOpacitySend(v){
  pendingOpacity = v;
  if (rafIdOpacity) return;
  rafIdOpacity = requestAnimationFrame(()=>{
    rafIdOpacity = 0;
    const val = clamp(parseFloat(pendingOpacity)||0, 0, 1);
    send('wpo_set_opacity', {opacity: val});
  });
}

// Scale controls (range + number)
function uiSetScale(v, source){
  v = clamp(parseFloat(v)||1, 0, 20);
  if (source !== 'range') $('scaleRange').value = v.toFixed(2);
  if (source !== 'input') $('scaleInput').value = v.toFixed(2);
  scheduleScaleSend(v);
}
$('scaleRange').addEventListener('input', e=> uiSetScale(e.target.value, 'range'));
$('scaleInput').addEventListener('change', e=> uiSetScale(e.target.value, 'input'));
$('scaleInput').addEventListener('keydown', e=> { if (e.key === 'Enter') uiSetScale(e.target.value, 'input'); });

// Opacity controls (range + number)
function uiSetOpacity(v, source){
  v = clamp(parseFloat(v)||0, 0, 1);
  if (source !== 'range') $('opacityRange').value = v.toFixed(2);
  if (source !== 'input') $('opacityInput').value = v.toFixed(2);
  scheduleOpacitySend(v);
}
$('opacityRange').addEventListener('input', e=> uiSetOpacity(e.target.value, 'range'));
$('opacityInput').addEventListener('change', e=> uiSetOpacity(e.target.value, 'input'));
$('opacityInput').addEventListener('keydown', e=> { if (e.key === 'Enter') uiSetOpacity(e.target.value, 'input'); });

// Local file picker -> dataURL -> page
const fileInput = document.getElementById('file');
if (fileInput){
  fileInput.addEventListener('change', e=>{
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { send('wpo_set_data_url', { dataUrl: r.result }); e.target.value = ''; };
    r.readAsDataURL(f);
  });
}

// Load initial state
send('wpo_get_state', {}, (resp)=>{ if (resp && resp.ok) initFromState(resp); });
