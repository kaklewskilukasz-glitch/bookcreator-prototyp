(function(){
const D={
pl:{myBooks:'Moje książki',lead:'Twórz książki z własnych materiałów — krok po kroku.',newBook:'＋ Nowy e-book',create:'Utwórz nową książkę',title:'Tytuł',topic:'O czym jest książka?',bookLanguage:'Język książki',audience:'Dla kogo?',next:'Dalej →',back:'← Wróć',writingStyle:'Wybierz styl pisania',materials:'Dodaj materiały',ready:'Materiały gotowe',toc:'Spis treści',content:'Treść książki',save:'💾 Zapisz książkę',copy:'Kopiuj tekst',appLanguage:'Język aplikacji'},
en:{myBooks:'My books',lead:'Create books from your own materials — step by step.',newBook:'＋ New e-book',create:'Create a new book',title:'Title',topic:'What is the book about?',bookLanguage:'Book language',audience:'Who is it for?',next:'Next →',back:'← Back',writingStyle:'Choose writing style',materials:'Add materials',ready:'Materials ready',toc:'Table of contents',content:'Book content',save:'💾 Save book',copy:'Copy text',appLanguage:'App language'},
sv:{myBooks:'Mina böcker',lead:'Skapa böcker från ditt eget material — steg för steg.',newBook:'＋ Ny e-bok',create:'Skapa en ny bok',title:'Titel',topic:'Vad handlar boken om?',bookLanguage:'Bokens språk',audience:'Vem är den för?',next:'Nästa →',back:'← Tillbaka',writingStyle:'Välj skrivstil',materials:'Lägg till material',ready:'Materialet är klart',toc:'Innehållsförteckning',content:'Bokens innehåll',save:'💾 Spara boken',copy:'Kopiera text',appLanguage:'Appens språk'}};
let lang=localStorage.getItem('bookcreator_ui_language')||'pl';
function txt(el,v){if(el)el.textContent=v}
function apply(l){lang=D[l]?l:'pl';localStorage.setItem('bookcreator_ui_language',lang);document.documentElement.lang=lang;const t=D[lang];
const home=document.getElementById('home'),setup=document.getElementById('setup'),style=document.getElementById('style'),materials=document.getElementById('materials'),analysis=document.getElementById('analysis'),outline=document.getElementById('outline'),editor=document.getElementById('editor');
if(home){txt(home.querySelector('h1'),t.myBooks);txt(home.querySelector('.lead'),t.lead);txt(home.querySelector('.primary'),t.newBook)}
if(setup){txt(setup.querySelector('h1'),t.create);let ls=setup.querySelectorAll('label');txt(ls[0],t.title);txt(ls[1],t.topic);txt(ls[2],t.bookLanguage);txt(ls[3],t.audience);txt(setup.querySelector('.primary'),t.next)}
if(style){txt(style.querySelector('h1'),t.writingStyle);txt(style.querySelector('.primary'),t.next)}
if(materials){txt(materials.querySelector('h1'),t.materials);txt(materials.querySelector('.primary'),t.next)}
if(analysis)txt(analysis.querySelector('h1'),t.ready);if(outline)txt(outline.querySelector('h1'),t.toc);if(editor){txt(editor.querySelector('h1'),t.content);let p=editor.querySelector('.primary');txt(p,t.save);let sec=editor.querySelectorAll('.secondary');if(sec[0])txt(sec[0],t.copy)}
document.querySelectorAll('.back').forEach(x=>txt(x,t.back));const s=document.getElementById('uiLanguage');if(s)s.value=lang;
}
function add(){if(document.getElementById('uiLanguage'))return;let header=document.querySelector('header');if(!header)return;let wrap=document.createElement('div');wrap.style.cssText='display:flex;align-items:center;gap:8px;margin-left:auto;margin-right:10px';let s=document.createElement('select');s.id='uiLanguage';s.setAttribute('aria-label','App language');s.style.cssText='width:auto;padding:7px 9px;border-radius:10px';s.innerHTML='<option value="pl">🇵🇱 Polski</option><option value="en">🇬🇧 English</option><option value="sv">🇸🇪 Svenska</option>';s.onchange=()=>apply(s.value);wrap.appendChild(s);header.insertBefore(wrap,header.lastElementChild);apply(lang)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();window.BookCreatorI18n={apply};
})();
