(function(){
  function selectedCount(){return Number(document.getElementById('chapterCount')?.value||7)}
  function normalizeChapters(list){
    const arr=(list||[]).map(x=>String(x).trim()).filter(Boolean);
    let n=0;
    return arr.map((name,i)=>{
      let clean=name.replace(/^\s*\d+[.)]\s*/,'').trim();
      if(/^wst[eę]p\b/i.test(clean)) return clean;
      if(/^zako[nń]czenie\b/i.test(clean)) return clean;
      n++; return n+'. '+clean;
    });
  }
  function syncCount(){const s=document.getElementById('chapterCount');if(!s)return;const n=document.querySelectorAll('#chapters input').length;if([...s.options].some(o=>Number(o.value)===n))s.value=String(n)}
  function mount(){
    const outline=document.getElementById('outline'),chapters=document.getElementById('chapters');
    if(!outline||!chapters)return;
    let box=document.getElementById('chapterCountBox');
    if(!box){box=document.createElement('div');box.id='chapterCountBox';box.className='materialbox';box.innerHTML='<label for="chapterCount">Ile pozycji ma mieć spis treści?</label><select id="chapterCount"><option value="5">5</option><option value="7" selected>7</option><option value="10">10</option><option value="12">12</option><option value="15">15</option><option value="20">20</option></select><p class="hint">Wybierz liczbę. „Wygeneruj inny spis” zachowa ten wybór.</p>';chapters.parentNode.insertBefore(box,chapters)}
    const oldRender=window.renderChapters;window.renderChapters=function(list){oldRender(normalizeChapters(list));syncCount()};
    const oldAdd=window.addChapter;window.addChapter=function(){if(oldAdd)oldAdd();const inputs=[...document.querySelectorAll('#chapters input')];let n=0;inputs.forEach(inp=>{let v=inp.value.trim();if(/^wst[eę]p\b/i.test(v)||/^zako[nń]czenie\b/i.test(v))return;n++;v=v.replace(/^\s*\d+[.)]\s*/,'');inp.value=n+'. '+v});syncCount()};
    const oldGenerate=window.generateOutline;
    window.generateOutline=async function(){
      let btn=document.getElementById('outlineBtn');if(btn){btn.disabled=true;btn.textContent='AI tworzy unikalny spis…'}
      if(window.outlineError)outlineError.textContent='';if(window.error)error.textContent='';
      try{const combined=materialsText.value+fileMaterials+linkMaterials;const r=await fetch('/api/outline',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:bookTitle.value,topic:topic.value,audience:audience.value,language:language.value,style:document.querySelector('.choice.selected b').textContent,materials:combined,chapterCount:selectedCount()})});const d=await r.json();if(!r.ok)throw Error(errorText(d.error)||'Nie udało się utworzyć spisu treści.');if(!Array.isArray(d.chapters)||!d.chapters.length)throw Error('AI nie zwróciło spisu treści.');renderChapters(d.chapters);go('outline','Krok 5 z 5')}catch(e){outlineError.textContent='❌ '+errorText(e?.message||e)}finally{if(btn){btn.disabled=false;btn.textContent='✨ Utwórz unikalny spis treści →'}}
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();