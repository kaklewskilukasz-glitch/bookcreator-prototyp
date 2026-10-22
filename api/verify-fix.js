export default {async fetch(request){if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});try{const {before,after,issue,language}=await request.json();if(!process.env.OPENAI_API_KEY)return Response.json({error:'Brak OPENAI_API_KEY.'},{status:500});const prompt=`Jesteś NIEZALEŻNYM kontrolerem jakości redakcji książki. Nie jesteś redaktorem, który wykonał zmianę. Masz krytycznie porównać wersję PRZED i PO oraz ocenić wyłącznie skutki tej jednej poprawki.

Sprawdź: 1) czy wskazany problem faktycznie rozwiązano, 2) czy zachowano głos autora, sens, fakty i emocje, 3) czy nie powstały nowe powtórzenia, sprzeczności, sztuczne brzmienie AI albo utrata informacji, 4) czy wersja PO jest rzeczywiście lepsza. Nie nagradzaj zmiany tylko dlatego, że została wykonana. Jeśli jest neutralna lub gorsza, odrzuć ją.

ZASADA STABILNEJ PUNKTACJI:
- scoreDelta oznacza wpływ TEJ JEDNEJ poprawki na ocenę CAŁEJ książki, a nie tylko rozdziału;
- jeśli recommendation="accept", resolved=true i better=true, scoreDelta MUSI być dodatni i realistyczny: zwykle 0.05–0.25, maksymalnie 0.40 dla bardzo ważnej poprawki;
- zaakceptowana poprawka nie może dostać 0 ani wartości ujemnej;
- jeśli poprawka jest neutralna, niepewna albo gorsza, recommendation="reject" i scoreDelta=0 lub wartość ujemna;
- nie zawyżaj punktów za kosmetykę;
- dodaj scoreReason: jedno konkretne zdanie wyjaśniające, dlaczego wynik zmienia się właśnie o tyle.

SZCZEGÓLNA ZASADA DLA URWANEGO/BRAKUJĄCEGO TEKSTU:
- nie wymagaj „odzyskania oryginału”, bo utraconego tekstu nie da się wiarygodnie odzyskać z samego rozdziału;
- jeśli problem dotyczy urwanego zakończenia lub placeholdera oznaczającego brak tekstu, uznaj problem za rozwiązany wtedy, gdy wersja PO usuwa znacznik braku i tworzy nowe, spójne zakończenie wynikające z istniejącego kontekstu;
- odrzuć poprawkę, jeśli placeholder nadal pozostał, zakończenie jest generyczne, wprowadza nowe niepoparte fakty/wątki albo nie pasuje do głosu autora;
- w werdykcie używaj sformułowania „zrekonstruowano zakończenie”, a nie „odzyskano brakujący oryginał”.

Język odpowiedzi: ${language||'Polski'}.
UWAGA REDAKCYJNA: ${JSON.stringify(issue||{})}
PRZED:\n${String(before||'').slice(0,50000)}
PO:\n${String(after||'').slice(0,50000)}

Zwróć WYŁĄCZNIE JSON bez markdown: {"resolved":true,"better":true,"newProblems":[],"verdict":"krótkie uzasadnienie","scoreDelta":0.15,"scoreReason":"konkretne uzasadnienie zmiany punktów","recommendation":"accept"}. recommendation tylko accept albo reject.`;const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:'gpt-6-luna',input:prompt,max_output_tokens:2500})});const d=await r.json();if(!r.ok)return Response.json({error:d?.error?.message||'Błąd OpenAI API'},{status:r.status});const raw=d.output_text||(d.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');let verification;try{verification=JSON.parse(raw.replace(/^```json\s*|\s*```$/g,''))}catch{return Response.json({error:'Kontroler zwrócił nieprawidłowy format.'},{status:502})}const accepted=verification?.recommendation==='accept'&&verification?.resolved===true&&verification?.better===true;let delta=Number(verification?.scoreDelta);if(!Number.isFinite(delta))delta=0;if(accepted){delta=Math.max(0.05,Math.min(0.4,delta||0.05))}else{delta=Math.min(0,delta)}verification.scoreDelta=Math.round(delta*100)/100;return Response.json({verification})}catch(e){return Response.json({error:e?.message||'Nieznany błąd'},{status:500})}}};