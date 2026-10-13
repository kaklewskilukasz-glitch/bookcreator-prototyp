export default {
  async fetch(request) {
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    try {
      const { title, topic, audience, language, style, materials, chapters, targetPages } = await request.json();
      if (!process.env.OPENAI_API_KEY) return Response.json({ error: 'Brak OPENAI_API_KEY w Vercel.' }, { status: 500 });
      const chapterList = Array.isArray(chapters) ? chapters.map(x=>String(x||'').trim()).filter(Boolean) : [];
      if (!chapterList.length) return Response.json({ error: 'Dodaj co najmniej jeden rozdział.' }, { status: 400 });
      const sourceText = String(materials || 'Brak dodatkowych materiałów').slice(0,70000);
      const pages = Math.max(10, Math.min(500, Number(targetPages) || 100));
      const targetWords = Math.round(pages * 300);
      const wordsPerChapter = Math.max(700, Math.round(targetWords / chapterList.length));
      const outputs=[];
      let previousSummary='';
      for(let i=0;i<chapterList.length;i++){
        const chapterTitle=chapterList[i];
        const prompt=`Napisz WYŁĄCZNIE jeden rozdział książki w języku ${language||'polskim'}.
Tytuł książki: ${title||'Bez tytułu'}
Temat książki: ${topic||''}
Odbiorca: ${audience||''}
Styl: ${style||'Prosty i naturalny'}
Rozdział ${i+1} z ${chapterList.length}: ${chapterTitle}
Docelowa długość tego rozdziału: około ${wordsPerChapter} słów. To ważny cel objętości — rozwiń temat wartościowo przykładami, wyjaśnieniami, praktycznymi zastosowaniami i płynnymi przejściami, bez sztucznego powtarzania.
Cała książka ma mieć około ${pages} stron 6×9 / ${targetWords} słów.
Pełny spis treści:
${chapterList.map((c,n)=>`${n+1}. ${c}`).join('\n')}

Materiały autora i źródła:
${sourceText}

Kontekst poprzednich części, aby nie powtarzać treści:
${previousSummary.slice(-6000)||'To pierwszy rozdział.'}

ZASADY: Zachowaj dokładny tytuł rozdziału. Nie pisz innych rozdziałów. Nie dodawaj komentarzy o procesie. Nie używaj technicznych znaczników markdown typu # lub ##. Pisz kompletną, gotową do publikacji treść. Zwróć tylko ten rozdział.`;
        const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:'gpt-6-luna',input:prompt,max_output_tokens:Math.min(16000,Math.max(5000,Math.ceil(wordsPerChapter*2.2)))})});
        const data=await r.json();
        if(!r.ok)return Response.json({error:`Rozdział ${i+1}: ${data?.error?.message||'Błąd OpenAI API'}`},{status:r.status});
        const text=data.output_text||(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
        if(!text?.trim())return Response.json({error:`AI nie zwróciło treści rozdziału ${i+1}.`},{status:502});
        outputs.push(text.trim());
        const clean=text.replace(/\s+/g,' ').trim();
        previousSummary+=`\n${chapterTitle}: ${clean.slice(0,1200)}`;
      }
      const fullText=outputs.join('\n\n');
      const actualWords=fullText.trim().split(/\s+/).filter(Boolean).length;
      return Response.json({text:fullText,targetPages:pages,targetWords,actualWords,estimatedPages:Math.round(actualWords/300),generationMode:'chapter-by-chapter'});
    } catch(e){return Response.json({error:e?.message||'Nieznany błąd'},{status:500})}
  }
};