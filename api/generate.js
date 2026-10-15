export default {
  async fetch(request) {
    if(request.method!=='POST') return Response.json({error:'Method not allowed'},{status:405});
    try{
      const {title,topic,audience,language,style,materials,chapters,targetPages,chapterIndex}=await request.json();
      if(!process.env.OPENAI_API_KEY) return Response.json({error:'Brak OPENAI_API_KEY w Vercel.'},{status:500});
      const list=Array.isArray(chapters)?chapters.map(x=>String(x||'').trim()).filter(Boolean):[];
      if(!list.length) return Response.json({error:'Dodaj co najmniej jeden rozdział.'},{status:400});
      const pages=Math.max(10,Math.min(500,Number(targetPages)||100));
      const targetWords=Math.round(pages*300);
      const wordsPerChapter=Math.max(700,Math.round(targetWords/list.length));
      const i=Math.max(0,Math.min(list.length-1,Number(chapterIndex)||0));
      const chapterTitle=list[i];
      const source=String(materials||'Brak dodatkowych materiałów').slice(0,50000);
      const prompt=`Napisz WYŁĄCZNIE jeden rozdział książki w języku ${language||'polskim'}.
Tytuł książki: ${title||'Bez tytułu'}
Temat: ${topic||''}
Odbiorca: ${audience||''}
Styl: ${style||'Prosty i naturalny'}
Rozdział ${i+1} z ${list.length}: ${chapterTitle}
Docelowa długość: około ${wordsPerChapter} słów. Cała książka ma około ${pages} stron / ${targetWords} słów.
Spis: ${list.map((c,n)=>`${n+1}. ${c}`).join(' | ')}
Materiały autora: ${source}
ZASADY: rozwiń temat wartościowo, bez powtórzeń; zachowaj dokładny tytuł; nie pisz innych rozdziałów; bez znaków markdown #/##; zwróć tylko gotowy rozdział.`;
      const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:'gpt-6-luna',input:prompt,max_output_tokens:Math.min(12000,Math.max(4500,Math.ceil(wordsPerChapter*2)))})});
      const raw=await r.text();let d;try{d=JSON.parse(raw)}catch{return Response.json({error:'OpenAI zwróciło nieprawidłową odpowiedź.'},{status:502})}
      if(!r.ok)return Response.json({error:d?.error?.message||'Błąd OpenAI API'},{status:r.status});
      const text=d.output_text||(d.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
      if(!text?.trim())return Response.json({error:'AI nie zwróciło treści rozdziału.'},{status:502});
      return Response.json({text:text.trim(),chapterIndex:i,totalChapters:list.length,targetPages:pages,targetWords,wordsPerChapter});
    }catch(e){return Response.json({error:e?.message||'Nieznany błąd'},{status:500})}
  }
};