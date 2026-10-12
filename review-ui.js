(function(){
function mount(){
  const editor=document.getElementById('editor'), content=document.getElementById('bookContent');
  if(!editor||!content||document.getElementById('reviewTools'))return;
  const box=document.createElement('div');
  box.id='reviewTools';box.className='materialbox';
  box.innerHTML=`<h2>🧐 Redaktor AI</h2><p class="hint">Redaktor przeczyta całą książkę i sprawdzi sens, logikę, powtórzenia, spójność, styl i błędy językowe. Nie zmieni tekstu bez Twojej decyzji.</p><button id="reviewBookBtn" class="secondary">🧐 Sprawdź całą książkę</button><div id="reviewStatus" class="saveinfo"></div><div id="reviewReport" style="display:none;white-space:pre-wrap;line-height:1.65;background:#fff;border:1px solid #ddd9ec;border-radius:14px;padding:18px;margin-top:12px;max-height:650px;overflow:auto"></div>`;
  editor.insertBefore(box,content);
  document.getElementById('reviewBookBtn').onclick=reviewBook;
}
async function reviewBook(){
  const btn=document.getElementById('reviewBookBtn'),status=document.getElementById('reviewStatus'),report=document.getElementById('reviewReport');
  const text=document.getElementById('bookContent')?.innerText?.trim()||'';
  if(!text){status.textContent='❌ Najpierw wygeneruj lub wpisz treść książki.';return}
  btn.disabled=true;btn.textContent='Redaktor czyta całą książkę…';status.textContent='Analiza całej książki…';report.style.display='none';
  try{
    const r=await fetch('/api/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:document.getElementById('bookTitle')?.value||'',text,language:document.getElementById('language')?.value||'Polski'})});
    const d=await r.json();if(!r.ok)throw Error(typeof d.error==='string'?d.error:'Błąd redaktora AI');
    report.textContent=d.report;report.style.display='block';status.textContent='✓ Redaktor zakończył analizę. Tekst książki nie został zmieniony.';
  }catch(e){status.textContent='❌ '+(e.message||e)}finally{btn.disabled=false;btn.textContent='🧐 Sprawdź całą książkę'}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();