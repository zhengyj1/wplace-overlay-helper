
// Popup script
function activeTab(cb){ chrome.tabs.query({active:true,currentWindow:true}, tabs=>cb(tabs[0])); }
function sendToTab(type, payload={}){
  activeTab(tab=>{
    if(!tab||!tab.id) return;
    chrome.tabs.sendMessage(tab.id, {type, ...payload}, resp=>{
      if(chrome.runtime.lastError){ console.warn(chrome.runtime.lastError.message); }
    });
  });
}
document.getElementById('btn-show').addEventListener('click', ()=>sendToTab('wpo_create_or_show'));
document.getElementById('btn-hide').addEventListener('click', ()=>sendToTab('wpo_hide'));
document.getElementById('btn-remove').addEventListener('click', ()=>sendToTab('wpo_remove'));
document.getElementById('btn-set-url').addEventListener('click', ()=>{
  const url=document.getElementById('url').value.trim(); if(!url) return; sendToTab('wpo_set_url',{url});
});
const op=document.getElementById('opacity'), opval=document.getElementById('opval');
op.addEventListener('input', ()=>{ opval.textContent=Number(op.value).toFixed(2); sendToTab('wpo_set_opacity',{opacity:Number(op.value)}); });
document.getElementById('btn-fitw').addEventListener('click', ()=>sendToTab('wpo_fit',{mode:'width'}));
document.getElementById('btn-fith').addEventListener('click', ()=>sendToTab('wpo_fit',{mode:'height'}));
document.getElementById('btn-reset').addEventListener('click', ()=>sendToTab('wpo_reset'));
document.getElementById('file').addEventListener('change', e=>{
  const f=e.target.files&&e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{ sendToTab('wpo_set_data_url',{dataUrl:r.result}); e.target.value=''; };
  r.readAsDataURL(f);
});
