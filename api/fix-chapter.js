export default {async fetch(request){if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});try{const {chapter,feedback,language}=await request.json();if(!process.env.OPENAI_API_KEY)return Response.json({error:'Brak OPENAI_API_KEY w Vercel.'},{status:500});if(!String(chapter||'').trim())return Response.json({error:'Brak treści do poprawy.'},{status:400});const prompt=`Jesteś profesjonalnym redaktorem książkowym. Otrzymujesz tekst źródłowy oraz JEDNĄ zaakceptowaną uwagę. Twoim zadaniem jest przygotować WYŁĄCZNIE tekst zastępczy dla wskazanego rozdziału.

ZASADY KRYTYCZNE:
- zastosuj tylko wskazaną uwagę;
- nie kopiuj innych rozdziałów ani całej książki;
- nie twórz alternatywnej wersji całej książki;
- nie dodawaj numeracji, znaków markdown (#, ##, **), jeśli nie są częścią zwykłego tekstu tytułu;
- tytuł rozdziału ma wystąpić dokładnie jeden raz;
- nie powtarzaj akapitów;
- zachowaj sens, głos autora i wszystkie ważne informacje;
- jeśli uwaga dotyczy tylko jednego zdania/akapitu, resztę wskazanego rozdziału pozostaw możliwie bez zmian;
- zwróć tylko pełną poprawioną wersję wskazanego rozdziału, bez komentarzy.

Język: ${language||'Polski'}.

UWAGA DO ZASTOSOWANIA:
${String(feedback||'').slice(0,12000)}

TEKST ŹRÓDŁOWY:
${String(chapter).slice(0,60000)}`;const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:'gpt-6-luna',input:prompt,max_output_tokens:10000})});const d=await r.json();if(!r.ok)return Response.json({error:d?.error?.message||'Błąd OpenAI API'},{status:r.status});const text=d.output_text||(d.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');return Response.json({text:text||'AI nie zwróciło poprawionej wersji.'})}catch(e){return Response.json({error:e?.message||'Nieznany błąd'},{status:500})}}};