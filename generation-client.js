(function(){
function parseResponse(r,raw){try{return JSON.parse(raw)}catch{throw Error(r.ok?'Serwer zwrócił nieprawidłową odpowiedź.':'Serwer przerwał generowanie. Spróbuj ponownie.')}}
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
   let r=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...base,chapterIndex:i})});
   let raw=await r.text(),d=parseResponse(r,raw);
   if(!r.ok)throw Error(d.error||`Błąd przy rozdziale ${i+1}`);
   if(!d.text)throw Error(`Brak treści rozdziału ${i+1}`);
   parts.push(d.text.trim());
  }
  const full=parts.join('\n\n');
  if(typeof setEditorContent==='function')setEditorContent(full);else bookContent.innerText=full;
  if(typeof go==='function')go('editor','Edytor');
  if(typeof scheduleAutosave==='function')scheduleAutosave();
 }catch(e){err.textContent='❌ '+(e?.message||e)}finally{btn.disabled=false;btn.textContent='✨ Generuj treść książki'}
};
})();