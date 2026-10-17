export default {async fetch(request){if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});try{const {chapter,feedback,language}=await request.json();if(!process.env.OPENAI_API_KEY)return Response.json({error:'Brak OPENAI_API_KEY w Vercel.'},{status:500});if(!String(chapter||'').trim())return Response.json({error:'Brak treści do poprawy.'},{status:400});const prompt=`Jesteś elitarnym redaktorem książkowym. Otrzymujesz DOKŁADNIE JEDEN rozdział oraz JEDNĄ zaakceptowaną uwagę redakcyjną. Masz wykonać najmniejszą możliwą zmianę, która rzeczywiście rozwiązuje wskazany problem.

ZASADA NADRZĘDNA: Nie zmieniaj tekstu dlatego, że umiesz napisać go inaczej. Zmieniaj wyłącznie to, co musi się zmienić, aby tekst był lepszy.

ZASADY KRYTYCZNE:
- zachowaj głos, ton, osobowość, sens i intencję autora;
- zastosuj WYŁĄCZNIE zaakceptowaną uwagę;
- jeśli uwaga dotyczy jednego zdania lub akapitu, nie ruszaj reszty;
- nie wygładzaj tekstu do generycznego stylu AI;
- nie dodawaj nowych faktów, historii, cytatów ani źródeł;
- jeśli uwaga dotyczy faktu wymagającego weryfikacji, nie wymyślaj odpowiedzi — zachowaj fakt lub zaznacz minimalnie potrzebę weryfikacji;
- nie usuwaj ważnych informacji;
- nie twórz nowych powtórzeń ani sprzeczności;
- nie kopiuj innych rozdziałów ani całej książki;
- nie twórz alternatywnej wersji całej książki;
- nie dodawaj markdown (#, ##, **);
- tytuł rozdziału ma wystąpić dokładnie jeden raz;
- nie powtarzaj akapitów;
- zachowaj strukturę i kolejność rozdziału, chyba że zaakceptowana uwaga wprost wymaga lokalnego przesunięcia;
- przed zwróceniem tekstu wewnętrznie sprawdź: czy problem został usunięty, czy głos autora pozostał, czy nic ważnego nie zniknęło i czy nie powstał nowy problem;
- zwróć WYŁĄCZNIE pełny tekst poprawionego rozdziału, bez komentarzy i bez opisu zmian.

Język: ${language||'Polski'}.

ZAAKCEPTOWANA UWAGA:
${String(feedback||'').slice(0,12000)}

ROZDZIAŁ ŹRÓDŁOWY:
${String(chapter).slice(0,60000)}`;const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:'gpt-6-luna',input:prompt,max_output_tokens:10000})});const d=await r.json();if(!r.ok)return Response.json({error:d?.error?.message||'Błąd OpenAI API'},{status:r.status});const text=d.output_text||(d.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');return Response.json({text:text||'AI nie zwróciło poprawionej wersji.'})}catch(e){return Response.json({error:e?.message||'Nieznany błąd'},{status:500})}}};