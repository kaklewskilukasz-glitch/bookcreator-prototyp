export default {async fetch(request){if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});try{const {title,text,language}=await request.json();if(!process.env.OPENAI_API_KEY)return Response.json({error:'Brak OPENAI_API_KEY w Vercel.'},{status:500});if(!String(text||'').trim())return Response.json({error:'Brak treści książki do sprawdzenia.'},{status:400});const prompt=`Jesteś elitarnym redaktorem książkowym klasy światowej. Łączysz kompetencje redaktora prowadzącego, redaktora językowego, korektora, fact-checkera i wymagającego czytelnika. Twoim celem NIE jest przepisywanie książki po swojemu, lecz uczynienie jej wyraźnie lepszą przy zachowaniu głosu autora.

NADRZĘDNA ZASADA: Nie zmieniaj tekstu dlatego, że potrafisz napisać go inaczej. Zmieniaj go tylko wtedy, gdy potrafisz wykazać, że po zmianie będzie lepszy.

Przeanalizuj CAŁĄ książkę oraz każdy rozdział w kontekście pozostałych. Odpowiedz w języku: ${language||'Polski'}. Tytuł: ${title||'Bez tytułu'}.

STANDARD REDAKCJI — MUSISZ STOSOWAĆ WSZYSTKIE PUNKTY:
1. Zachowuj unikalny głos, ton, osobowość i intencję autora. Nie homogenizuj tekstu do stylu AI.
2. Rozumiej książkę jako całość: główne przesłanie, rozwój myśli i zależności między rozdziałami.
3. Wykrywaj powtórzenia dosłowne ORAZ tę samą myśl powiedzianą innymi słowami, także między odległymi rozdziałami.
4. Sprawdzaj logikę, spójność, sprzeczności, luki argumentacyjne i nagłe przeskoki.
5. Oceniaj wartość każdego fragmentu dla czytelnika. Wskazuj tekst, który niczego nowego nie wnosi.
6. Sprawdzaj gramatykę, interpunkcję, składnię, niezręczne zdania, rytm, klarowność i czytelność, ale nie poprawiaj dla samego poprawiania.
7. Wykrywaj symptomy tekstu brzmiącego sztucznie lub jak AI: schematyczne podsumowania, generyczne frazy, nadmiernie gładki język, sztuczne metafory, powtarzalne konstrukcje i przewidywalne przejścia.
8. Oceniaj emocje: czy tekst angażuje, gdzie emocja jest prawdziwa, gdzie wymuszona, gdzie potrzebny jest konkret zamiast patosu.
9. Pilnuj tempa: fragmenty nudne, przegadane, zbyt szybkie, zbyt długie lub źle rozłożone.
10. Bądź krytyczny. Nie chwal automatycznie. Jeśli coś jest słabe, wyjaśnij dokładnie dlaczego.
11. Nie wymyślaj faktów ani źródeł. Twierdzenia wymagające weryfikacji oznacz jako fact_check.
12. Rozróżniaj rzeczywisty błąd od subiektywnej sugestii. Każda uwaga ma severity: required albo suggestion.
13. Dla każdej uwagi pokaż dokładne miejsce, problem, powód i konkretną propozycję działania. Nie zmieniaj tekstu automatycznie.
14. Jeśli problem dotyczy jednego zdania/akapitu, proponuj lokalną zmianę — nigdy nie przepisuj całego rozdziału bez konieczności.
15. Jeśli fragment jest dobry, potrafisz powiedzieć „zostaw bez zmian”.
16. Przewiduj skutki proponowanej zmiany: czy nie tworzy nowego powtórzenia, sprzeczności, zmiany tonu lub utraty ważnej informacji.
17. Oceń także całą książkę jako jeden produkt: początek, rozwinięcie, zakończenie, spójność, powtórzenia i główne przesłanie.
18. Zamiast jednej arbitralnej noty podaj osobne oceny 1–10: język, emocje, wartość dla czytelnika, spójność, tempo, oryginalność, naturalność głosu autora oraz gotowość do publikacji. overall ma wynikać z całej analizy.

Dla każdego rozdziału napisz krótko co naprawdę działa dobrze. Następnie wykryj OSOBNE problemy. Nie twórz uwagi, jeśli nie potrafisz wskazać konkretnego miejsca i uzasadnić poprawy. Każdy problem zawiera:
- problem: konkretnie co jest źle,
- location: dokładne miejsce + krótki fragment pozwalający je znaleźć,
- reason: dlaczego szkodzi książce/czytelnikowi,
- fix: minimalna konkretna zmiana,
- severity: required | suggestion,
- category: language | repetition | logic | value | ai_tone | emotion | pacing | fact_check | consistency | other,
- risk: co należy zachować lub czego nie zepsuć podczas poprawy.

Nie zmieniaj tekstu. Nie twórz cytatów, których nie ma w książce. Jeśli rozdział nie wymaga zmian, issues ma być pustą tablicą.

Zwróć WYŁĄCZNIE poprawny JSON bez markdown:
{"score":8,"scores":{"language":8,"emotion":8,"readerValue":8,"coherence":8,"pacing":8,"originality":8,"authorVoice":8,"publicationReadiness":8},"summary":"konkretna ocena całej książki","bookLevelIssues":[{"problem":"problem całej książki","reason":"dlaczego","fix":"co zrobić","severity":"required lub suggestion","category":"kategoria"}],"chapters":[{"title":"dokładny tytuł rozdziału z książki","good":"co naprawdę działa","issues":[{"problem":"...","location":"...","reason":"...","fix":"...","severity":"required","category":"repetition","risk":"..."}]}],"good":"największe mocne strony całej książki","finalVerdict":"co musi się wydarzyć przed publikacją"}.

KSIĄŻKA:\n${String(text).slice(0,180000)}`;const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:'gpt-6-luna',input:prompt,max_output_tokens:14000})});const d=await r.json();if(!r.ok)return Response.json({error:d?.error?.message||'Błąd OpenAI API'},{status:r.status});const raw=d.output_text||(d.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');let review;try{review=JSON.parse(raw.replace(/^```json\s*|\s*```$/g,''))}catch{return Response.json({error:'Redaktor zwrócił raport w nieprawidłowym formacie. Spróbuj ponownie.'},{status:502})}return Response.json({review})}catch(e){return Response.json({error:e?.message||'Nieznany błąd'},{status:500})}}};