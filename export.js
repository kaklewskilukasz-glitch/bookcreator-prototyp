(function(){
  const load=(src)=>new Promise((resolve,reject)=>{if(document.querySelector(`script[src="${src}"]`))return resolve();const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  const safeName=()=>((document.getElementById('bookTitle')?.value||'ksiazka').trim().replace(/[\\/:*?"<>|]+/g,'-')||'ksiazka');
  const text=()=>document.getElementById('bookContent')?.innerText||'';
  const html=()=>document.getElementById('bookContent')?.innerHTML||'';
  const download=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)};
  window.exportPDF=async function(){
    const info=document.getElementById('exportInfo');info.textContent='Tworzę PDF…';
    try{await load('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
      const wrap=document.createElement('div');wrap.style.cssText='background:white;color:#111;padding:40px;font-family:Arial,sans-serif;line-height:1.6';wrap.innerHTML=`<h1>${(document.getElementById('bookTitle')?.value||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}</h1>${html()}`;
      await html2pdf().set({margin:12,filename:safeName()+'.pdf',image:{type:'jpeg',quality:.98},html2canvas:{scale:2},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy']}}).from(wrap).save();info.textContent='✓ PDF zapisany.';
    }catch(e){info.textContent='❌ Nie udało się utworzyć PDF.'}
  };
  window.exportDOCX=async function(){
    const info=document.getElementById('exportInfo');info.textContent='Tworzę DOCX…';
    try{await load('https://cdn.jsdelivr.net/npm/docx@9.5.1/dist/index.iife.js');const D=window.docx;
      const children=[];const title=document.getElementById('bookTitle')?.value||'Bez tytułu';children.push(new D.Paragraph({text:title,heading:D.HeadingLevel.TITLE}));
      const root=document.getElementById('bookContent');for(const n of root.childNodes){const t=(n.innerText||n.textContent||'').trim();if(!t)continue;const tag=(n.tagName||'').toUpperCase();let heading;if(tag==='H1')heading=D.HeadingLevel.HEADING_1;else if(tag==='H2')heading=D.HeadingLevel.HEADING_2;children.push(new D.Paragraph({text:t,heading}));}
      if(children.length===1) text().split(/\n+/).filter(Boolean).forEach(t=>children.push(new D.Paragraph(t)));
      const doc=new D.Document({sections:[{children}]});download(await D.Packer.toBlob(doc),safeName()+'.docx');info.textContent='✓ DOCX zapisany.';
    }catch(e){console.error(e);info.textContent='❌ Nie udało się utworzyć DOCX.'}
  };
  window.exportEPUB=async function(){
    const info=document.getElementById('exportInfo');info.textContent='Tworzę EPUB…';
    try{await load('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');const z=new JSZip();z.file('mimetype','application/epub+zip',{compression:'STORE'});const meta=z.folder('META-INF');meta.file('container.xml','<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');const o=z.folder('OEBPS');const title=(document.getElementById('bookTitle')?.value||'Bez tytułu').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));o.file('book.xhtml',`<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title><meta charset="utf-8"/></head><body><h1>${title}</h1>${html()}</body></html>`);o.file('content.opf',`<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">bookcreator-${Date.now()}</dc:identifier><dc:title>${title}</dc:title><dc:language>pl</dc:language><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/,'Z')}</meta></metadata><manifest><item id="book" href="book.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="book"/></spine></package>`);download(await z.generateAsync({type:'blob',mimeType:'application/epub+zip'}),safeName()+'.epub');info.textContent='✓ EPUB zapisany.';
    }catch(e){console.error(e);info.textContent='❌ Nie udało się utworzyć EPUB.'}
  };
  function mount(){const save=document.querySelector('#editor .primary[onclick="saveBook(false)"]');if(!save||document.getElementById('exportTools'))return;const box=document.createElement('div');box.id='exportTools';box.innerHTML='<div class="aitoolbar"><button onclick="exportPDF()">📄 PDF</button><button onclick="exportDOCX()">📝 DOCX</button><button onclick="exportEPUB()">📚 EPUB</button></div><div id="exportInfo" class="saveinfo">Eksportuj gotową książkę.</div>';save.parentNode.insertBefore(box,save.nextSibling)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();