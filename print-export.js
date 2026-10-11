(function(){
const load=src=>new Promise((ok,bad)=>{if(window.jspdf)return ok();const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=bad;document.head.appendChild(s)});
const title=()=>document.getElementById('bookTitle')?.value?.trim()||'Book';
const author=()=>document.getElementById('bookAuthor')?.value?.trim()||'';
const filename=()=>title().replace(/[\\/:*?"<>|]+/g,'-')||'book';
function blocks(){const root=document.getElementById('bookContent'),out=[];if(!root)return out;[...root.childNodes].forEach(n=>{let t=(n.innerText||n.textContent||'').trim();if(!t)return;let tag=(n.tagName||'').toUpperCase();if(/^#{1,3}\s/.test(t)){let m=t.match(/^(#{1,3})\s+/);out.push({type:'h'+m[1].length,text:t.replace(/^#{1,3}\s+/,'')});return}if(['H1','H2','H3'].includes(tag))out.push({type:tag.toLowerCase(),text:t});else out.push({type:'p',text:t})});return out}
window.exportPrintPDF=async function(){const info=document.getElementById('exportInfo');if(info)info.textContent='Tworzę PDF do druku 6×9…';try{await load('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');const {jsPDF}=window.jspdf;const pdf=new jsPDF({unit:'mm',format:[152.4,228.6],orientation:'portrait'});const W=152.4,H=228.6,top=18,bottom=18,outer=15,gutter=20;let page=1,y=top;
const margins=()=>page%2?{l:gutter,r:outer}:{l:outer,r:gutter};
const footer=()=>{pdf.setFont('times','normal');pdf.setFontSize(9);pdf.setTextColor(110);pdf.text(String(page),W/2,H-9,{align:'center'});pdf.setTextColor(25)};
const next=()=>{footer();pdf.addPage([W,H],'portrait');page++;y=top};
const lines=(txt,size,bold=false)=>{let m=margins(),max=W-m.l-m.r;pdf.setFont('times',bold?'bold':'normal');pdf.setFontSize(size);return {a:pdf.splitTextToSize(txt,max),m}};
// Title page
pdf.setFont('times','bold');pdf.setFontSize(25);let tl=pdf.splitTextToSize(title(),W-42),ty=75;tl.forEach(l=>{pdf.text(l,W/2,ty,{align:'center'});ty+=10});if(author()){pdf.setFont('times','normal');pdf.setFontSize(13);pdf.text(author(),W/2,ty+12,{align:'center'})}footer();pdf.addPage([W,H],'portrait');page++;y=top;
// Content
let first=true;for(const b of blocks()){if(b.type==='h1'||b.type==='h2'){if(!first){footer();pdf.addPage([W,H],'portrait');page++;y=top}first=false;let q=lines(b.text,b.type==='h1'?19:17,true);y=35;q.a.forEach(l=>{pdf.text(l,q.m.l,y);y+=8});y+=8;continue}let size=b.type==='h3'?13:11.5,bold=b.type==='h3';let q=lines(b.text,size,bold),lh=b.type==='h3'?6:5.4;if(y+q.a.length*lh>H-bottom)next();q.a.forEach(l=>{if(y+lh>H-bottom)next();let m=margins();pdf.text(l,m.l,y);y+=lh});y+=b.type==='h3'?4:3}
footer();pdf.save(filename()+'-PRINT-6x9.pdf');if(info)info.textContent='✓ PDF do druku 6×9 gotowy — format książkowy, margines wewnętrzny i numeracja stron.'}catch(e){console.error(e);if(info)info.textContent='❌ Nie udało się utworzyć PDF do druku.'}}
function mount(){const tools=document.querySelector('#exportTools .aitoolbar');if(!tools||document.getElementById('printPdfBtn'))return;const b=document.createElement('button');b.id='printPdfBtn';b.textContent='📖 Książka papierowa 6×9';b.onclick=window.exportPrintPDF;tools.appendChild(b)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,0));else setTimeout(mount,0);
})();