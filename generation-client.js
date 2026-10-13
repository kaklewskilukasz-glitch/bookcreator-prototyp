(function(){
function parseResponse(r,raw){try{return JSON.parse(raw)}catch{throw Error(r.ok?'Serwer zwrócił nieprawidłową odpowiedź.':'Serwer przerwał generowanie. Spróbuj ponownie.')}}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function chapterBody(text,title){let s=String(text||'').trim().replace(/^#{1,3}\s*/gm,'');const lines=s.split(/\n+/).map(x=>x.trim()).filter(Boolean);if(lines.length&&lines[0].replace(/^\d+[.)]?\s*/,'').trim().toLowerCase()===String(title).replace(/^\d+[.)]?\s*/,'').trim().toLowerCase())lines.shift();return lines.map(p=>`<p>${esc(p)}</p>`).join('')}
window.generateBook=async function(){
 const btn=document.getElementById('gen'),err=document.getElementById('error');
 const list=[...document.querySelectorAll('#chapters input')].map(x=>x.value.trim()).filter(Boolean);
 if(!list.length){err.textContent='❌ Dodaj co najmniej jeden rozdział.';return}
 const pages=typeof window.getTargetPages==='function'?window.getTargetPages():100;
 const base={title:bookTitle.value,topic:topic.value,audience:audience.value,language:language.value,style:document.querySelector('.choice.selected b')?.textContent||'Prosty i naturalny',materials:(materialsText.value||'')+(window.fileMaterials||fileMaterials||'')+(window.linkMaterials||linkMaterials||''),chapters:list,targetPages:pages};
 btn.disabled=true;err.textContent='';const parts=[];
 try{
  for(let i=0;i<list.length;i++){
   btn.textContent=`✨ Generuję rozdział ${i+1} z ${list.length}…`;
   const r=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...base,chapterIndex:i})});
   const raw=await r.text(),d=parseResponse(r,raw);
   if(!r.ok)throw Error(d.error||`Błąd przy rozdziale ${i+1}`);
   if(!d.text)throw Error(`Brak treści rozdziału ${i+1}`);
   parts.push(`<h1>${esc(list[i])}</h1>${chapterBody(d.text,list[i])}`);
  }
  bookContent.innerHTML=parts.join('');
  if(typeof go==='function')go('editor','Edytor');
  if(typeof scheduleAutosave==='function')scheduleAutosave();
 }catch(e){err.textContent='❌ '+(e?.message||e)}finally{btn.disabled=false;btn.textContent='✨ Generuj treść książki'}
};
})();